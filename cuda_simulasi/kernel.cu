
#include "cuda_runtime.h"
#include "device_launch_parameters.h"
#include <math.h>
#include <stdio.h>
#include <iostream>
#include <fstream>
#include "tridiag_solver.h"
#include <chrono>

void print_arr(double arr[], int size);
void write_to_csv(double arr[]);

__global__ void generate_bx(double* C, double* A_a, double* A_b, double* A_c, double* bx, double sigma, double c0);
__global__ void generate_by(double* C, double* Cx, double* A_a, double* A_b, double* A_c, double* by, double sigma, double c0);
__global__ void generate_bz(double* C, double* Cy, double* A_a, double* A_b, double* A_c, double* bz, double sigma, double c0);
__global__ void update_C(double* C, double* Cz);

const int n = 18;
const double dt = 0.001;
const double l = 1;
const double t = 1;
const double c0 = 1;
const double D = 0.01;

const int nt = int(t / dt);
const double d = l / (n - 1);
const double sigma = D * dt / pow(d, 2);

int main()
{
    std::chrono::steady_clock::time_point begin = std::chrono::steady_clock::now();

    double C[n*n*n] = {};

    for (int z = 0; z < n; z++)
    {
        for (int y = 0; y < n; y++)
        {
            for (int x = 0; x < n; x++)
            {
                if (y == 0)
                {
                    C[z * n * n + y * n + x] = c0;
                }
            }
        }
    }

    for (int z = 0; z < n; z++)
    {
        for (int y = 0; y < n; y++) 
        {
            for (int x = 0; x < n; x++) 
            {
                std::cout << C[z * n * n + y * n + x] << " ";
            }
            std::cout << std::endl;
        }
        std::cout << "--------------------------" << std::endl;
    }

    double A_a[(n - 2) * (n - 2) * (n - 2) - 1] = {};
    double A_b[(n - 2) * (n - 2) * (n - 2)] = {};
    double A_c[(n - 2) * (n - 2) * (n - 2) - 1] = {};
    
    // setup tridiagonal matrix
    for (int z = 0; z < n - 2; z++)
    {
        for (int y = 0; y < n - 2; y++) 
        {
            for (int x = 0; x < n - 2; x++) 
            {
                // A matriks sama untuk x, y, z karena hitungannya di transpose
                int id = z * (n - 2) * (n - 2) + y * (n - 2) + x;
                int left = id - 1;

                A_b[id] = 1.0 + sigma;

                if (x == 0)
                {
                    A_c[id] += -0.5 * sigma;
                }
                else if (x == n - 3)
                {
                    A_a[left] += -0.5 * sigma;
                }
                else
                {
                    A_c[id] += -0.5 * sigma;
                    A_a[left] += -0.5 * sigma;
                }
            }
        }
    }

    // allocate needed resources at global memory
    double *d_a, *d_b, *d_c, *d_bx, *d_by, *d_bz, *d_Cx, *d_Cy, *d_Cz, *d_C; 

    cudaMalloc(&d_a, ((n - 2) * (n - 2) * (n - 2) - 1) * sizeof(double));
    cudaMalloc(&d_b, ((n - 2) * (n - 2) * (n - 2)) * sizeof(double));
    cudaMalloc(&d_c, ((n - 2) * (n - 2) * (n - 2) - 1) * sizeof(double));
    cudaMalloc(&d_bx, ((n - 2) * (n - 2) * (n - 2)) * sizeof(double));
    cudaMalloc(&d_by, ((n - 2) * (n - 2) * (n - 2)) * sizeof(double));
    cudaMalloc(&d_bz, ((n - 2) * (n - 2) * (n - 2)) * sizeof(double));
    cudaMalloc(&d_Cx, ((n - 2) * (n - 2) * (n - 2)) * sizeof(double));
    cudaMalloc(&d_Cy, ((n - 2) * (n - 2) * (n - 2)) * sizeof(double));
    cudaMalloc(&d_Cz, ((n - 2) * (n - 2) * (n - 2)) * sizeof(double));
    cudaMalloc(&d_C, (n * n * n) * sizeof(double));
    
    cudaMemcpy(d_a, A_a, ((n - 2) * (n - 2) * (n - 2) - 1) * sizeof(double), cudaMemcpyHostToDevice);
    cudaMemcpy(d_b, A_b, ((n - 2) * (n - 2) * (n - 2)) * sizeof(double), cudaMemcpyHostToDevice);
    cudaMemcpy(d_c, A_c, ((n - 2) * (n - 2) * (n - 2) - 1) * sizeof(double), cudaMemcpyHostToDevice);
    cudaMemcpy(d_C, C, (n * n * n) * sizeof(double), cudaMemcpyHostToDevice);

    for (int i = 0; i < nt; i++)
    {
        int block_count = ceil(((n - 2) * (n - 2) * (n - 2)) / block_size);

        generate_bx<<<block_count, block_size>>>(d_C, d_a, d_b, d_c, d_bx, sigma, c0);
        cudaDeviceSynchronize();

        // solve tridiagonal matrix for C'
        solve_cr(d_a, d_b, d_c, d_Cx, d_bx);

        generate_by<<<block_count, block_size>>>(d_C, d_Cx, d_a, d_b, d_c, d_by, sigma, c0);
        cudaDeviceSynchronize();

        // solve tridiagonal matrix for C''
        solve_cr(d_a, d_b, d_c, d_Cy, d_by);

        generate_bz<<<block_count, block_size>>>(d_C, d_Cy, d_a, d_b, d_c, d_bz, sigma, c0);
        cudaDeviceSynchronize();

        // solve tridiagonal matrix for Ct+1
        solve_cr(d_a, d_b, d_c, d_Cz, d_bz);

        update_C<<<block_count, block_size>>>(d_C, d_Cz);
        cudaDeviceSynchronize();
    }

    cudaMemcpy(C, d_C, (n * n * n) * sizeof(double), cudaMemcpyDeviceToHost);

    //print_arr(A_a, (ny - 2)* (nx - 2) - 1);
    //print_arr(A_b, (ny - 2)* (nx - 2));
    //print_arr(A_c, (ny - 2)* (nx - 2) - 1);

    for (int z = 0; z < n; z++)
    {
        for (int y = 0; y < n; y++)
        {
            for (int x = 0; x < n; x++)
            {
                std::cout << C[z * n * n + y * n + x] << " ";
            }
            std::cout << std::endl;
        }
        std::cout << "--------------------------" << std::endl;
    }

    write_to_csv(C);

    std::chrono::steady_clock::time_point end = std::chrono::steady_clock::now();
    std::cout << "Time difference = " << std::chrono::duration_cast<std::chrono::microseconds>(end - begin).count() << "[µs]" << std::endl;

    return 0;
}

void print_arr(double arr[], int size)
{
    printf("[");
    for (int i = 0; i < size - 1; i++)
    {
        printf("%.2f, ", arr[i]);
    }
    printf("%.2f", arr[size - 1]);
    printf("]\n");
}

void write_to_csv(double arr[]) {
    std::ofstream myfile;
    myfile.open("18x18x18.csv");

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

    myfile.close();
}

__global__ void generate_bx(double* C, double* A_a, double* A_b, double* A_c, double* bx, double sigma, double c0)
{
    int idx = blockIdx.x * block_size + threadIdx.x;

    if (idx < (n - 2) * (n - 2) * (n - 2))
    {
        int x = idx % (n - 2);
        int y = (idx / (n - 2)) % (n - 2);
        int z = idx / ((n - 2) * (n - 2));

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

        // boundary conditions
        if (x == 0)
        {
            bx[idx] += 0 * 0.5 * sigma;
        }
        else if (x == n - 3)
        {
            bx[idx] += 0 * 0.5 * sigma;
        }
    }
}

__global__ void generate_by(double* C, double* Cx, double* A_a, double* A_b, double* A_c, double* by, double sigma, double c0)
{
    int idx = blockIdx.x * block_size + threadIdx.x;
    
    if (idx < (n - 2) * (n - 2) * (n - 2))
    {
        int x = idx % (n - 2);
        int y = (idx / (n - 2)) % (n - 2);
        int z = idx / ((n - 2) * (n - 2));

        int idt = z * (n - 2) * (n - 2) + x * (n - 2) + y;
        int c_id = (z + 1) * n * n + (y + 1) * n + (x + 1);

        int up = c_id + n;
        int down = c_id - n;

        by[idt] = Cx[idx] - 0.5 * sigma * (C[down] - 2 * C[c_id] + C[up]);

        // boundary conditions
        if (y == 0)
        {
            by[idt] += c0 * 0.5 * sigma;
        }
        else if (y == n - 3)
        {
            by[idt] += 0 * 0.5 * sigma;
        }
    }
}

__global__ void generate_bz(double* C, double* Cy, double* A_a, double* A_b, double* A_c, double* bz, double sigma, double c0)
{
    int idx = blockIdx.x * block_size + threadIdx.x;

    if (idx < (n - 2) * (n - 2) * (n - 2))
    {
        int x = idx % (n - 2);
        int y = (idx / (n - 2)) % (n - 2);
        int z = idx / ((n - 2) * (n - 2));

        int idy = z * (n - 2) * (n - 2) + x * (n - 2) + y;
        int idz = x * (n - 2) * (n - 2) + y * (n - 2) + z;
        int c_id = (z + 1) * n * n + (y + 1) * n + (x + 1);

        int front = c_id + n * n;
        int back = c_id - n * n;

        bz[idz] = Cy[idy] - 0.5 * sigma * (C[back] - 2 * C[c_id] + C[front]);

        // boundary conditions
        if (z == 0)
        {
            bz[idz] += 0 * 0.5 * sigma;
        }
        else if (z == n - 3)
        {
            bz[idz] += 0 * 0.5 * sigma;
        }
    }
}

__global__ void update_C(double* C, double* Cz)
{
    int idx = blockIdx.x * block_size + threadIdx.x;

    if (idx < (n - 2) * (n - 2) * (n - 2))
    {
        int x = idx % (n - 2);
        int y = (idx / (n - 2)) % (n - 2);
        int z = idx / ((n - 2) * (n - 2));

        int idt = x * (n - 2) * (n - 2) + y * (n - 2) + z;
        int c_id = (x + 1) * n * n + (y + 1) * n + (z + 1);

        C[c_id] = Cz[idt];
    }
}
