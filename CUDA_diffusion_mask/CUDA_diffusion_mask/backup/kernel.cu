#include "cuda_runtime.h"
#include "device_launch_parameters.h"
#include <math.h>
#include <stdio.h>
#include <iostream>
#include <fstream>
#include <string>
#include <sstream>
#include <chrono>
#include <vector>
#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"
#define STB_IMAGE_RESIZE_IMPLEMENTATION
#include "stb_image_resize.h"

#define FREE_MEMORY \
    do { \
        return 0; \
    } while(0);

#define CUDA_CALL_AND_CHECK(call, msg) \
    do { \
        cuda_error = call; \
        if (cuda_error != cudaSuccess) { \
            printf("Example FAILED: CUDA API returned error = %d, details: " #msg "\n", cuda_error); \
            FREE_MEMORY; \
            return -1; \
        } \
    } while(0);

void print_arr(double arr[], int size);
void print_arr(int arr[], int size);
void print_arr_3d(double arr[], int n);
void write_to_csv(double arr[], int n, const char* filename);
void print_debug(double* a, double* b, double* c, double* x, double* y, int size);

void setAx(double Ax_a[], double Ax_b[], double Ax_c[], int n, double sigma);
void setAy(double Ay_a[], double Ay_b[], double Ay_c[], int mask[], int n, double sigma);
void setAz(double Az_a[], double Az_b[], double Az_c[], int n, double sigma);

void fixEdges(double C[], int n);

__global__ void generate_bx(double* C, double* bx, int n);
__global__ void generate_by(double* C, double* Cx, double* by, int* mask, int n);
__global__ void generate_bz(double* C, double* Cy, double* bz, int n);
__global__ void update_C(double* C, double* Cz, int* mask, int n);

void solve_cr(double* d_a, double* d_b, double* d_c, double* d_x, double* d_y, int size);
__global__ void forward_reduce(double* a, double* b, double* c, double* x, double* y, int depth, int thread_count, int size);
__global__ void elimination(double* a, double* b, double* c, double* x, double* y, int depth, int size_padded, int size);
__global__ void backward_subs(double* a, double* b, double* c, double* x, double* y, int depth, int thread_count, int size);

int loadImage(const char* filename, int real_width, int real_height, int* mask);
int readCSVFlattened(const std::string & filename, int* mask, int width, int height);
int check_double(char* in, double* out);
int check_and_apply(double* output, char* D, char* T, char* dt, char* l, char* n, char* c0);
void print_progress_bar(int i, int nt);

const int block_size = 512;
__device__ double device_constant[2];

cudaError cuda_error = cudaSuccess;

int main(int argc, char* argv[])
{
    if (argc != 9) {
        return 1;
    }

    // process constants
    double output[6];
    check_and_apply(output, argv[3], argv[4], argv[5], argv[6], argv[7],
        argv[8]);

    double D = output[0];
    double T = output[1];
    double dt = output[2];
    double l = output[3];
    int n = (int)output[4];
    double c0 = output[5];

    printf("Parameter:\nD:%f\nT:%f\ndt:%f\nl:%f\nn:%d\nc0:%f\n", D, T, dt, l, n, c0);

    // process file input
    const char* filename;
    filename = argv[1];

    const char* dot = strrchr(filename, '.');
    printf("File type: %s\n", dot);

    // initialize mask array
    int real_width = (n - 2);
    int real_height = (n - 2);
    int* mask = new int[real_height * real_width];

    if (strcmp(dot + 1, "csv") == 0) {
        int err = readCSVFlattened(filename, mask, real_width, real_height);
        if (err == 1) {
            return err;
        }
    }
    else if (strcmp(dot + 1, "png") == 0) {
        int err = loadImage(filename, real_width, real_height, mask);
        if (err == 1) {
            return err;
        }
    }
    else {
        return 1;
    }

    const char* output_name = strcat(argv[2], ".csv");
    printf("Output: %s\n", output_name);

    // calculate parameter needed for simulation
    const int nt = int(T / dt);
    const double d = l / (n - 1);
    const double sigma = D * dt / pow(d, 2);

    const int size = (n - 2) * (n - 2) * (n - 2); // matrix size harus 2^n

    // move constants to device
    double h_array[2] = { sigma, c0 };
    cudaMemcpyToSymbol(device_constant, h_array, sizeof(h_array));

    // initial condition
    double* C = (double*)calloc(n * n * n, sizeof(double));

    for (int z = 1; z < n - 1; z++)
    {
        for (int x = 1; x < n - 1; x++)
        {
            int y = n - 1;
            int idx = z * n * n + y * n + x;
            int id_mask = (z - 1) * (n - 2) + (x - 1);
            C[idx] = c0 * (1 - mask[id_mask]);
        }
    }

    // allocate memory on device
    double* Ax_a = (double*)calloc(size, sizeof(double));
    double* Ax_b = (double*)calloc(size, sizeof(double));
    double* Ax_c = (double*)calloc(size, sizeof(double));

    double* Ay_a = (double*)calloc(size, sizeof(double));
    double* Ay_b = (double*)calloc(size, sizeof(double));
    double* Ay_c = (double*)calloc(size, sizeof(double));

    double* Az_a = (double*)calloc(size, sizeof(double));
    double* Az_b = (double*)calloc(size, sizeof(double));
    double* Az_c = (double*)calloc(size, sizeof(double));

    // initialize Ax, Ay, Az
    setAx(Ax_a, Ax_b, Ax_c, n, sigma);
    setAy(Ay_a, Ay_b, Ay_c, mask, n, sigma);
    setAz(Az_a, Az_b, Az_c, n, sigma);

    double* d_Ax_a, * d_Ax_b, * d_Ax_c;
    double* d_Ay_a, * d_Ay_b, * d_Ay_c;
    double* d_Az_a, * d_Az_b, * d_Az_c;
    double* d_bx, * d_by, * d_bz;
    double* d_Cx, * d_Cy, * d_Cz, * d_C;
    int* d_mask;

    //allocate memory on device
    CUDA_CALL_AND_CHECK(cudaMalloc(&d_Ax_a, (size) * sizeof(double)), "d_Ax_a");
    CUDA_CALL_AND_CHECK(cudaMalloc(&d_Ax_b, (size) * sizeof(double)), "d_Ax_b");
    CUDA_CALL_AND_CHECK(cudaMalloc(&d_Ax_c, (size) * sizeof(double)), "d_Ax_c");
    CUDA_CALL_AND_CHECK(cudaMalloc(&d_Ay_a, (size) * sizeof(double)), "d_Ay_a");
    CUDA_CALL_AND_CHECK(cudaMalloc(&d_Ay_b, (size) * sizeof(double)), "d_Ay_b");
    CUDA_CALL_AND_CHECK(cudaMalloc(&d_Ay_c, (size) * sizeof(double)), "d_Ay_c");
    CUDA_CALL_AND_CHECK(cudaMalloc(&d_Az_a, (size) * sizeof(double)), "d_Az_a");
    CUDA_CALL_AND_CHECK(cudaMalloc(&d_Az_b, (size) * sizeof(double)), "d_Az_b");
    CUDA_CALL_AND_CHECK(cudaMalloc(&d_Az_c, (size) * sizeof(double)), "d_Az_c");
    CUDA_CALL_AND_CHECK(cudaMalloc(&d_bx, (size) * sizeof(double)), "d_bx");
    CUDA_CALL_AND_CHECK(cudaMalloc(&d_by, (size) * sizeof(double)), "d_by");
    CUDA_CALL_AND_CHECK(cudaMalloc(&d_bz, (size) * sizeof(double)), "d_bz");
    CUDA_CALL_AND_CHECK(cudaMalloc(&d_Cx, (size) * sizeof(double)), "d_Cx");
    CUDA_CALL_AND_CHECK(cudaMalloc(&d_Cy, (size) * sizeof(double)), "d_Cy");
    CUDA_CALL_AND_CHECK(cudaMalloc(&d_Cz, (size) * sizeof(double)), "d_Cz");
    CUDA_CALL_AND_CHECK(cudaMalloc(&d_C, (n * n * n) * sizeof(double)), "d_C");
    CUDA_CALL_AND_CHECK(cudaMalloc(&d_mask, (n - 2) * (n - 2) * sizeof(int)), "d_mask");

    // copy host memory to device
    CUDA_CALL_AND_CHECK(cudaMemcpy(d_Ax_a, Ax_a, (size) * sizeof(double), cudaMemcpyHostToDevice), "");
    CUDA_CALL_AND_CHECK(cudaMemcpy(d_Ax_b, Ax_b, (size) * sizeof(double), cudaMemcpyHostToDevice), "");
    CUDA_CALL_AND_CHECK(cudaMemcpy(d_Ax_c, Ax_c, (size) * sizeof(double), cudaMemcpyHostToDevice), "");
    CUDA_CALL_AND_CHECK(cudaMemcpy(d_Ay_a, Ay_a, (size) * sizeof(double), cudaMemcpyHostToDevice), "");
    CUDA_CALL_AND_CHECK(cudaMemcpy(d_Ay_b, Ay_b, (size) * sizeof(double), cudaMemcpyHostToDevice), "");
    CUDA_CALL_AND_CHECK(cudaMemcpy(d_Ay_c, Ay_c, (size) * sizeof(double), cudaMemcpyHostToDevice), "");
    CUDA_CALL_AND_CHECK(cudaMemcpy(d_Az_a, Az_a, (size) * sizeof(double), cudaMemcpyHostToDevice), "");
    CUDA_CALL_AND_CHECK(cudaMemcpy(d_Az_b, Az_b, (size) * sizeof(double), cudaMemcpyHostToDevice), "");
    CUDA_CALL_AND_CHECK(cudaMemcpy(d_Az_c, Az_c, (size) * sizeof(double), cudaMemcpyHostToDevice), "");
    CUDA_CALL_AND_CHECK(cudaMemcpy(d_C, C, (n * n * n) * sizeof(double), cudaMemcpyHostToDevice), "");
    CUDA_CALL_AND_CHECK(cudaMemcpy(d_mask, mask, (n - 2) * (n - 2) * sizeof(int), cudaMemcpyHostToDevice), "");

    std::chrono::steady_clock::time_point begin = std::chrono::steady_clock::now();
    printf("SIMULATING...\n");
    // start simulation
    for (int i = 0; i < nt; i++)
    {
        int block_count = (int)ceil(float(size) / block_size);

        generate_bx<<<block_count, block_size>>>(d_C, d_bx, n);
        //print_debug(d_Ax_a, d_Ax_b, d_Ax_c, d_Cx, d_bx, size);
        cudaDeviceSynchronize();

        // solve tridiagonal matrix for C'
        solve_cr(d_Ax_a, d_Ax_b, d_Ax_c, d_Cx, d_bx, size);

        generate_by<<<block_count, block_size>>>(d_C, d_Cx, d_by, d_mask, n);
        cudaDeviceSynchronize();

        // solve tridiagonal matrix for C''
        solve_cr(d_Ay_a, d_Ay_b, d_Ay_c, d_Cy, d_by, size);

        generate_bz<<<block_count, block_size>>>(d_C, d_Cy, d_bz, n);
        cudaDeviceSynchronize();

        // solve tridiagonal matrix for Ct+1
        solve_cr(d_Az_a, d_Az_b, d_Az_c, d_Cz, d_bz, size);

        update_C<<<block_count, block_size>>>(d_C, d_Cz, d_mask, n);
        cudaDeviceSynchronize();

        print_progress_bar(i, nt);
    }
    printf("\n");
    CUDA_CALL_AND_CHECK(cudaMemcpy(C, d_C, (n * n * n) * sizeof(double), cudaMemcpyDeviceToHost), "");

    std::chrono::steady_clock::time_point end = std::chrono::steady_clock::now();
    std::cout << "Time difference = " << std::chrono::duration_cast<std::chrono::microseconds>(end - begin).count() << "[µs]" << std::endl;
    
    fixEdges(C, n);
    //print_arr_3d(C, n);
    write_to_csv(C, n, output_name);
    return 0;
}

void print_arr(double arr[], int size)
{
    printf("[");
    for (int i = 0; i < size - 1; i++)
    {
        printf("%f, ", arr[i]);
    }
    printf("%f", arr[size - 1]);
    printf("]\n");
}

void print_arr(int arr[], int size)
{
    printf("[");
    for (int i = 0; i < size - 1; i++)
    {
        printf("%d, ", arr[i]);
    }
    printf("%d", arr[size - 1]);
    printf("]\n");
}

void write_to_csv(double arr[], int n, const char* filename) {
    std::ofstream myfile;
    myfile.open(filename);

    for (int z = 0; z < n; z++)
    {
        for (int y = 0; y < n; y++)
        {
            for (int x = 0; x < n; x++)
            {
                myfile << arr[z * n * n + y * n + x] << ",";
            }
        }
    }
    myfile << n << "," << n << "," << n;
    myfile.close();
}

void print_debug(double* d_a, double* d_b, double* d_c, double* d_x, double* d_y, int size)
{
    double* a = new double[size];
    double* b = new double[size];
    double* c = new double[size];
    double* x = new double[size];
    double* y = new double[size];

    cudaMemcpy(a, d_a, (size) * sizeof(double), cudaMemcpyDeviceToHost);
    cudaMemcpy(b, d_b, (size) * sizeof(double), cudaMemcpyDeviceToHost);
    cudaMemcpy(c, d_c, (size) * sizeof(double), cudaMemcpyDeviceToHost);
    cudaMemcpy(x, d_x, (size) * sizeof(double), cudaMemcpyDeviceToHost);
    cudaMemcpy(y, d_y, (size) * sizeof(double), cudaMemcpyDeviceToHost);

    printf("----------------------\n");
    print_arr(a, size);
    print_arr(b, size);
    print_arr(c, size);
    print_arr(x, size);
    print_arr(y, size);
    printf("----------------------\n");

    delete[]a;
    delete[]b;
    delete[]c;
    delete[]x;
    delete[]y;
}

void setAx(double Ax_a[], double Ax_b[], double Ax_c[], int n, double sigma)
{
    for (int z = 0; z < n - 2; z++)
    {
        for (int y = 0; y < n - 2; y++)
        {
            for (int x = 0; x < n - 2; x++)
            {
                int idx = z * (n - 2) * (n - 2) + y * (n - 2) + x;

                if (x == 0) {
                    Ax_c[idx] = -0.5 * sigma;
                    Ax_b[idx] = 1 + (0.5 * sigma);
                }
                else if (x == n - 3) {
                    Ax_a[idx] = -0.5 * sigma;
                    Ax_b[idx] = 1 + (0.5 * sigma);
                }
                else {
                    Ax_c[idx] = -0.5 * sigma;
                    Ax_b[idx] = (1.0 + sigma);
                    Ax_a[idx] = -0.5 * sigma;
                }
            }
        }
    }
}

void setAy(double Ay_a[], double Ay_b[], double Ay_c[], int mask[], int n, double sigma)
{
    for (int z = 0; z < n - 2; z++)
    {
        for (int y = 0; y < n - 2; y++)
        {
            for (int x = 0; x < n - 2; x++)
            {
                int idy = z * (n - 2) * (n - 2) + x * (n - 2) + y;
                int id_mask = z * (n - 2) + x;

                if (y == 0) {
                    Ay_c[idy] = -0.5 * sigma;
                    Ay_b[idy] = 1.0 + (0.5 * sigma);
                }
                else if (y == n - 3) {
                    Ay_a[idy] = -0.5 * sigma;
                    if (mask[id_mask] == 1) {
                        Ay_b[idy] = 1 + (0.5 * sigma);
                    }
                    else {
                        Ay_b[idy] = (1.0 + sigma);
                    }
                }
                else {
                    Ay_c[idy] = -0.5 * sigma;
                    Ay_b[idy] = (1.0 + sigma);
                    Ay_a[idy] = -0.5 * sigma;
                }
            }
        }
    }
}

void setAz(double Az_a[], double Az_b[], double Az_c[], int n, double sigma)
{
    for (int z = 0; z < n - 2; z++)
    {
        for (int y = 0; y < n - 2; y++)
        {
            for (int x = 0; x < n - 2; x++)
            {
                int idz = x * (n - 2) * (n - 2) + y * (n - 2) + z;

                if (z == 0) {
                    Az_b[idz] = 1 + (0.5 * sigma);
                    Az_c[idz] = -0.5 * sigma;
                }
                else if (z == n - 3) {
                    Az_a[idz] = -0.5 * sigma;
                    Az_b[idz] = 1 + (0.5 * sigma);
                }
                else {
                    Az_a[idz] = -0.5 * sigma;
                    Az_b[idz] = (1.0 + sigma);
                    Az_c[idz] = -0.5 * sigma;
                }
            }
        }
    }
}

void fixEdges(double C[], int n)
{
    for (int i = 0; i < n; i++) {
        C[(n - 1) * n + i] = C[n * n + (n - 1) * n + i];
        C[(n - 1) * n * n + (n - 1) * n + i] = C[(n - 2) * n * n + (n - 1) * n + i];
        C[i * n * n + (n - 1) * n] = C[i * n * n + (n - 1) * n + 1];
        C[i * n * n + (n - 1) * n + (n - 1)] = C[i * n * n + (n - 1) * n + (n - 2)];

        C[i] = C[n * n + i];
        C[(n - 1) * n * n + i] = C[(n - 2) * n * n + i];
        C[i * n * n] = C[i * n * n + 1];
        C[i * n * n + (n - 1)] = C[i * n * n + (n - 2)];

        C[i * n] = C[i * n + 1];
        C[i * n + (n - 1)] = C[i * n + (n - 2)];
        C[(n - 1) * n * n + i * n] = C[(n - 1) * n * n + i * n + 1];
        C[(n - 1) * n * n + i * n + (n - 1)] = C[(n - 1) * n * n + i * n + (n - 2)];
    }
}

__global__ void generate_bx(double* C, double* bx, int n)
{
    int i = blockIdx.x * block_size + threadIdx.x;

    if (i < (n - 2) * (n - 2) * (n - 2))
    {
        double sigma = device_constant[0];

        int x = i % (n - 2);
        int y = (i / (n - 2)) % (n - 2);
        int z = i / ((n - 2) * (n - 2));

        int idx = i;
        int c_id = (z + 1) * n * n + (y + 1) * n + (x + 1);

        int left = c_id - 1;
        int right = c_id + 1;
        int up = c_id + n;
        int down = c_id - n;
        int front = c_id + n * n;
        int back = c_id - n * n;

        bx[idx] = C[c_id] + 0.5 * sigma * (C[left] - 2 * C[c_id] + C[right])
            + sigma * (C[down] - 2 * C[c_id] + C[up])
            + sigma * (C[back] - 2 * C[c_id] + C[front]);
    }
}

__global__ void generate_by(double* C, double* Cx, double* by, int* mask, int n)
{
    int i = blockIdx.x * block_size + threadIdx.x;

    if (i < (n - 2) * (n - 2) * (n - 2))
    {
        double sigma = device_constant[0];
        double c0 = device_constant[1];

        int x = i % (n - 2);
        int y = (i / (n - 2)) % (n - 2);
        int z = i / ((n - 2) * (n - 2));

        int idx = i;
        int idy = z * (n - 2) * (n - 2) + x * (n - 2) + y;
        int id_mask = z * (n - 2) + x;
        int c_id = (z + 1) * n * n + (y + 1) * n + (x + 1);

        int up = c_id + n;
        int down = c_id - n;

        by[idy] = Cx[idx] - 0.5 * sigma * (C[down] - 2 * C[c_id] + C[up]);

        if (y == n - 3)
        {
            if (mask[id_mask] == 0)
            {
                by[idy] += c0 * (0.5 * sigma);
            }
        }
    }
}

__global__ void generate_bz(double* C, double* Cy, double* bz, int n)
{
    int i = blockIdx.x * block_size + threadIdx.x;

    if (i < (n - 2) * (n - 2) * (n - 2))
    {
        double sigma = device_constant[0];

        int x = i % (n - 2);
        int y = (i / (n - 2)) % (n - 2);
        int z = i / ((n - 2) * (n - 2));

        int idy = z * (n - 2) * (n - 2) + x * (n - 2) + y;
        int idz = x * (n - 2) * (n - 2) + y * (n - 2) + z;
        int c_id = (z + 1) * n * n + (y + 1) * n + (x + 1);

        int front = c_id + n * n;
        int back = c_id - n * n;

        bz[idz] = Cy[idy] - 0.5 * sigma * (C[back] - 2 * C[c_id] + C[front]);
    }
}

__global__ void update_C(double* C, double* Cz, int* mask, int n)
{
    int i = blockIdx.x * block_size + threadIdx.x;

    if (i < (n - 2) * (n - 2) * (n - 2))
    {
        int x = i % (n - 2);
        int y = (i / (n - 2)) % (n - 2);
        int z = i / ((n - 2) * (n - 2));

        int idz = x * (n - 2) * (n - 2) + y * (n - 2) + z;
        int id_mask = z * (n - 2) + x;
        int c_id = (z + 1) * n * n + (y + 1) * n + (x + 1);

        C[c_id] = Cz[idz];

        int left = c_id - 1;
        int right = c_id + 1;
        int up = c_id + n;
        int down = c_id - n;
        int front = c_id + n * n;
        int back = c_id - n * n;

        if (x == 0) {
            C[left] = C[c_id];
        }
        if (x == n - 3) {
            C[right] = C[c_id];
        }
        if (y == 0) {
            C[down] = C[c_id];
        }
        if (y == n - 3) {
            if (mask[id_mask] == 1) {
                C[up] = C[c_id];
            }
        }
        if (z == 0) {
            C[back] = C[c_id];
        }
        if (z == n - 3) {
            C[front] = C[c_id];
        }
    }
}

// input is array at global memory, output d_x
void solve_cr(double* d_a, double* d_b, double* d_c, double* d_x, double* d_y, int size)
{
    int size_padded = 1 << (int)(ceil(log2(size)));
    int depth = int(log2(size_padded)) - 1;

    // handle malloc at global memory
    double* dd_a, * dd_b, * dd_c, * dd_y;
    cudaMalloc(&dd_a, (size) * sizeof(double));
    cudaMalloc(&dd_b, (size) * sizeof(double));
    cudaMalloc(&dd_c, (size) * sizeof(double));
    cudaMalloc(&dd_y, (size) * sizeof(double));

    cudaMemcpy(dd_a, d_a, (size) * sizeof(double), cudaMemcpyDeviceToDevice);
    cudaMemcpy(dd_b, d_b, (size) * sizeof(double), cudaMemcpyDeviceToDevice);
    cudaMemcpy(dd_c, d_c, (size) * sizeof(double), cudaMemcpyDeviceToDevice);
    cudaMemcpy(dd_y, d_y, (size) * sizeof(double), cudaMemcpyDeviceToDevice);

    // forward reduction
    for (int i = 0; i < depth; i++)
    {
        int thread_count = size_padded / (1 << (i + 1));
        int block_count = (thread_count + block_size - 1) / block_size;

        forward_reduce << <block_count, block_size >> > (dd_a, dd_b, dd_c, d_x, dd_y, i, thread_count, size);
        cudaDeviceSynchronize();
    }

    // elimination
    elimination << <1, 1 >> > (dd_a, dd_b, dd_c, d_x, dd_y, depth, size_padded, size);
    cudaDeviceSynchronize();

    // backward subtitution
    for (int i = depth - 1; i >= 0; i--)
    {
        int thread_count = size_padded / (1 << (i + 1));
        int block_count = (thread_count + block_size - 1) / block_size;

        backward_subs << <block_count, block_size >> > (dd_a, dd_b, dd_c, d_x, dd_y, i, thread_count, size);
        cudaDeviceSynchronize();
    }

    cudaFree(dd_a);
    cudaFree(dd_b);
    cudaFree(dd_c);
    cudaFree(dd_y);
}

__global__ void forward_reduce(double* a, double* b, double* c, double* x, double* y, int depth, int thread_count, int size)
{
    int i = blockIdx.x * block_size + threadIdx.x;
    if (i < thread_count)
    {
        int idx = ((1 << (depth + 1)) - 1) + (i * (1 << (depth + 1)));
        int offset = 1 << depth;
        //printf("f: i:%d, idx:%d, a:%f, b:%f, c:%f, y:%f,\n", i, idx, a[idx], b[idx], c[idx], y[idx]);
        if (idx < size)
        {
            if (idx + offset > size - 1)
            {
                double alpha = -a[idx] / b[idx - offset];
                a[idx] = alpha * a[idx - offset];
                b[idx] = b[idx] + (alpha * c[idx - offset]);
                y[idx] = y[idx] + (alpha * y[idx - offset]);
            }
            else
            {
                double alpha = -a[idx] / b[idx - offset];
                double beta = -c[idx] / b[idx + offset];
                a[idx] = alpha * a[idx - offset];
                b[idx] = b[idx] + alpha * c[idx - offset] + beta * a[idx + offset];
                c[idx] = beta * c[idx + offset];
                y[idx] = y[idx] + alpha * y[idx - offset] + beta * y[idx + offset];
            }
        }
    }
}

__global__ void elimination(double* a, double* b, double* c, double* x, double* y, int depth, int size_padded, int size)
{
    int id_first = ((1 << depth) - 1);
    int id_second = ((1 << depth) - 1) + (1 << depth);
    y[id_first] = y[id_first] / b[id_first];
    c[id_first] = c[id_first] / b[id_first];
    if (size == size_padded) {
        x[id_second] = (y[id_second] - (a[id_second] * y[id_first])) / (b[id_second] - (a[id_second] * c[id_first]));
        x[id_first] = y[id_first] - (c[id_first] * x[id_second]);
    }
    else {
        x[id_first] = y[id_first] - c[id_first];
    }
}

__global__ void backward_subs(double* a, double* b, double* c, double* x, double* y, int depth, int thread_count, int size)
{
    int i = blockIdx.x * block_size + threadIdx.x;
    if (i < thread_count)
    {
        int idx = ((1 << depth) - 1) + i * (1 << (depth + 1));
        int offset = (1 << depth);
        if (idx < size)
        {
            if (idx + offset > size - 1)
            {
                x[idx] = (y[idx] - a[idx] * x[idx - offset]) / b[idx];
            }
            else {
                x[idx] = (y[idx] - a[idx] * x[idx - offset] - c[idx] * x[idx + offset]) / b[idx];
            }
        }
        //printf("x:%f,\n", x[idx]);
    }
}


void print_arr_3d(double arr[], int n)
{
    for (int z = 0; z < n; z++)
    {
        for (int y = 0; y < n; y++)
        {
            for (int x = 0; x < n; x++)
            {
                std::cout << arr[z * n * n + y * n + x] << " ";
            }
            std::cout << std::endl;
        }
        std::cout << "--------------------------" << std::endl;
    }
}

int loadImage(const char* filename, int real_width, int real_height, int* mask) {
    int width, height, channels;
    bool resize = false;

    unsigned char* input = stbi_load(filename, &width, &height, &channels, 1);
    if (!input) {
        std::cerr << "Failed to load image\n";
        return 1;
    }

    std::vector<unsigned char> resized(real_width * real_height);
    if (width != real_width || height != real_height) {
        resize = true;
        std::cout << "IMAGE SIZE DIFFERENT. RESIZING" << std::endl;
        int success = stbir_resize_uint8(
            input, width, height, 0,
            resized.data(), real_width, real_height, 0,
            1
        );
        if (!success) {
            std::cerr << "Resize failed\n";
            return 1;
        }
        stbi_image_free(input);
    }

    for (int y = 0; y < real_height; ++y) {
        for (int x = 0; x < real_width; ++x) {
            int i = y * real_width + x;
            if (resize) {
                mask[i] = resized[i] < 128 ? 0 : 1;
            }
            else {
                mask[i] = input[i] < 128 ? 0 : 1;
            }
        }
    }

    return 0;
}

int readCSVFlattened(const std::string& filename, int* mask, int width, int height) {
    std::vector<int> data;
    std::ifstream file(filename);
    std::string line;

    if (!file.is_open()) {
        std::cerr << "Failed to open file\n";
        return 1;
    }

    while (std::getline(file, line)) {
        std::stringstream ss(line);
        std::string cell;

        while (std::getline(ss, cell, ',')) {
            data.push_back(std::stoi(cell));
        }
    }

    for (size_t i = 0; i < width * height; ++i) {
        mask[i] = data[i];
    }

    return 0;
}

int check_double(char* in, double* out) {
    if (in == NULL) { return 1; }
    char* end;
    double value = strtod(in, &end);

    if (*end == '\0') {
        *out = value;
        return 0;
    }
    else {
        printf("Invalid input: %s\n", end);
        return 1;
    }
}

int check_and_apply(double* output, char* D, char* T, char* dt, char* l, char* n, char* c0) {
    if (check_double(D, &output[0]) == 1) { return 1; }
    if (check_double(T, &output[1]) == 1) { return 1; }
    if (check_double(dt, &output[2]) == 1) { return 1; }
    if (check_double(l, &output[3]) == 1) { return 1; }
    if (check_double(n, &output[4]) == 1) { return 1; }
    if (check_double(c0, &output[5]) == 1) { return 1; }
    return 0;
}

void print_progress_bar(int i, int nt) {
    printf("\r%d/%d", i, nt);  // Move to beginning of line
    fflush(stdout);  // Force output flush
}