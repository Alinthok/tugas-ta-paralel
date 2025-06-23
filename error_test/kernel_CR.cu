#include "cuda_runtime.h"
#include "device_launch_parameters.h"
#include <math.h>
#include <stdio.h>
#include <iostream>
#include <chrono>

#define CUDA_CALL_AND_CHECK(call, msg) \
    do { \
        cuda_error = call; \
        if (cuda_error != cudaSuccess) { \
            printf("Example FAILED: CUDA API returned error = %d, details: " #msg "\n", cuda_error); \
            return -1; \
        } \
    } while(0);

const int size = 10; // matrix size harus 2^n
const int block_size = 1024;
long total_time = 0;

void print_arr(double arr[], int size);
void generate_for_test(double* a, double* b, double* c, double* x, double* y, int size);
void check_error(double* a, double* b, double* c, double* x, double* y, int size);
cudaError solve_cr(double* a, double* b, double* c, double* x, double* y);
__global__ void forward_reduce(double* a, double* b, double* c, double* x, double* y, int depth, int thread_count, int size);
__global__ void elimination(double* a, double* b, double* c, double* x, double* y, int depth, int size_padded, int size);
__global__ void backward_subs(double* a, double* b, double* c, double* x, double* y, int depth, int thread_count, int size);

int main()
{
    // set random number seed
    srand(time(0));
    cudaError cuda_error = cudaSuccess;

    int run_times = 10;

    for (int i = 0; i < run_times + 1; i++)
    {
        double* h_a = new double[size];
        double* h_b = new double[size];
        double* h_c = new double[size];
        double* h_x = new double[size];
        double* h_y = new double[size];
        generate_for_test(h_a, h_b, h_c, h_x, h_y, size);

        // solve tridiagonal matrix using cyclic reduction method
        CUDA_CALL_AND_CHECK(solve_cr(h_a, h_b, h_c, h_x, h_y), "");
        check_error(h_a, h_b, h_c, h_x, h_y, size);
        print_arr(h_b, size);
        delete[]h_a;
        delete[]h_b;
        delete[]h_c;
        delete[]h_x;
        delete[]h_y;

        // ignore first run
        if (i == 0) { total_time = 0; }
    }

    std::cout << "Avg time = " << (double)total_time / (double)run_times << std::endl;

    return 0;
}


void generate_for_test(double* a, double* b, double* c, double* x, double* y, int size)
{
    for (int i = 0; i < size; i++) {
        double perturb = (rand() % 100000) / 100000.0;
        a[i] = 1.0f + perturb;
        perturb = (rand() % 100000) / 100000.0;
        b[i] = 1.0f + perturb;
        perturb = (rand() % 100000) / 100000.0;
        c[i] = 1.0f + perturb;
        perturb = (rand() % 100000) / 100000.0;
        y[i] = 1.0f + perturb;
        x[i] = 0.0f;
    }
    a[0] = 0.0f;
    c[size - 1] = 0.0f;
}

void check_error(double* a, double* b, double* c, double* x, double* y, int size)
{
    double* y_res = new double[size];
    y_res[0] = b[0] * x[0] + c[0] * x[1];
    y_res[size-1] = a[size - 1] * x[size - 2] + b[size - 1] * x[size - 1];
    for (int i = 1; i < size-1; i++) {
        y_res[i] = a[i] * x[i - 1] + b[i] * x[i] + c[i] * x[i + 1];
    }

    double total_err = 0;
    for (int i = 0; i < size; i++) {
        total_err += abs(y_res[i] - y[i]);
    }
    printf("Avg Error: %f\n", (total_err / size));
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

cudaError solve_cr(double* a, double* b, double* c, double* x, double* y)
{
    cudaError cuda_error = cudaSuccess;
    int size_padded = 1 << (int)(ceil(log2(size)));
    int depth = int(log2(size_padded)) - 1;

    // handle malloc at global memory
    double* d_a, * d_b, * d_c, * d_x, * d_y;
    cuda_error = cudaMalloc(&d_a, (size) * sizeof(double));
    if (cuda_error != cudaSuccess) {
        goto Error;
    }
    cuda_error = cudaMalloc(&d_b, (size) * sizeof(double));
    if (cuda_error != cudaSuccess) {
        goto Error;
    }
    cuda_error = cudaMalloc(&d_c, (size) * sizeof(double));
    if (cuda_error != cudaSuccess) {
        goto Error;
    }
    cuda_error = cudaMalloc(&d_x, (size) * sizeof(double));
    if (cuda_error != cudaSuccess) {
        goto Error;
    }
    cuda_error = cudaMalloc(&d_y, (size) * sizeof(double));
    if (cuda_error != cudaSuccess) {
        goto Error;
    }

    cuda_error = cudaMemcpy(d_a, a, (size) * sizeof(double), cudaMemcpyHostToDevice);
    if (cuda_error != cudaSuccess) {
        goto Error;
    }
    cuda_error = cudaMemcpy(d_b, b, (size) * sizeof(double), cudaMemcpyHostToDevice);
    if (cuda_error != cudaSuccess) {
        goto Error;
    }
    cuda_error = cudaMemcpy(d_c, c, (size) * sizeof(double), cudaMemcpyHostToDevice);
    if (cuda_error != cudaSuccess) {
        goto Error;
    }
    cuda_error = cudaMemcpy(d_x, x, (size) * sizeof(double), cudaMemcpyHostToDevice);
    if (cuda_error != cudaSuccess) {
        goto Error;
    }
    cuda_error = cudaMemcpy(d_y, y, (size) * sizeof(double), cudaMemcpyHostToDevice);
    if (cuda_error != cudaSuccess) {
        goto Error;
    }

    // start timer
    std::chrono::steady_clock::time_point begin = std::chrono::steady_clock::now();

    // forward reduction
    for (int i = 0; i < depth; i++)
    {
        int thread_count = size_padded / (1 << (i + 1));
        int block_count = (thread_count + block_size - 1) / block_size;
        forward_reduce << <block_count, block_size >> > (d_a, d_b, d_c, d_x, d_y, i, thread_count, size);
        cuda_error = cudaGetLastError();
        if (cuda_error != cudaSuccess) {
            fprintf(stderr, "forward_reduce launch failed: %s\n", cudaGetErrorString(cuda_error));
            goto Error;
        }

        cuda_error = cudaDeviceSynchronize();
        if (cuda_error != cudaSuccess) {
            goto Error;
        }
    }

    // elimination
    elimination << <1, 1 >> > (d_a, d_b, d_c, d_x, d_y, depth, size_padded, size);
    cuda_error = cudaGetLastError();
    if (cuda_error != cudaSuccess) {
        fprintf(stderr, "elimination launch failed: %s\n", cudaGetErrorString(cuda_error));
        goto Error;
    }
    cuda_error = cudaDeviceSynchronize();
    if (cuda_error != cudaSuccess) {
        goto Error;
    }

    // backward subtitution
    for (int i = depth - 1; i >= 0; i--)
    {
        int thread_count = size_padded / (1 << (i + 1));
        int block_count = (thread_count + block_size - 1) / block_size;

        backward_subs << <block_count, block_size >> > (d_a, d_b, d_c, d_x, d_y, i, thread_count, size);
        cuda_error = cudaGetLastError();
        if (cuda_error != cudaSuccess) {
            fprintf(stderr, "backward_subs launch failed: %s\n", cudaGetErrorString(cuda_error));
            goto Error;
        }
        cuda_error = cudaDeviceSynchronize();
        if (cuda_error != cudaSuccess) {
            goto Error;
        }
    }

    // record time
    std::chrono::steady_clock::time_point end = std::chrono::steady_clock::now();
    long time = std::chrono::duration_cast<std::chrono::microseconds>(end - begin).count();
    std::cout << "Running Time = " << time << "[microsec]" << std::endl;
    total_time += time;

    cuda_error = cudaMemcpy(x, d_x, (size) * sizeof(double), cudaMemcpyDeviceToHost);
    if (cuda_error != cudaSuccess) {
        goto Error;
    }

Error:
    cudaFree(d_a);
    cudaFree(d_b);
    cudaFree(d_c);
    cudaFree(d_x);
    cudaFree(d_y);
    return cuda_error;
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