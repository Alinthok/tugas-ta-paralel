﻿#include "cuda_runtime.h"
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

const int size = 16*16*16; // matrix size harus 2^n
const int block_size = 1024;
long total_time = 0;

void print_arr(double arr[], int size);
void generate_diag(double arr[], int size, int val);
void generate_arr(double arr[], int size);
cudaError solve_cr(double* a, double* b, double* c, double* x, double* y);
__global__ void forward_reduce(double* a, double* b, double* c, double* x, double* y, int depth, int thread_count, int size);
__global__ void elimination(double* a, double* b, double* c, double* x, double* y, int depth, int size_padded, int size);
__global__ void backward_subs(double* a, double* b, double* c, double* x, double* y, int depth, int thread_count, int size);

int main()
{
    cudaError cuda_error = cudaSuccess;

    int run_times = 100;

    for (int i = 0; i < run_times + 1; i++)
    {
        double* h_a = new double[size];
        double* h_b = new double[size];
        double* h_c = new double[size];
        double* h_x = new double[size];
        double* h_y = new double[size];

        generate_diag(h_a, size, 1);
        generate_diag(h_b, size, 2);
        generate_diag(h_c, size, 1);
        generate_diag(h_x, size, 0);
        generate_diag(h_y, size, 1);

        // solve tridiagonal matrix using cyclic reduction method
        CUDA_CALL_AND_CHECK(solve_cr(h_a, h_b, h_c, h_x, h_y), "");

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

void generate_diag(double arr[], int size, int val)
{
    for (int i = 0; i < size; i++)
    {
        arr[i] = val;
    }
}


void generate_arr(double arr[], int size)
{
    for (int i = 0; i < size; i++)
    {
        arr[i] = (rand() % 100);
    }
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

    cuda_error = cudaMemcpy(a, d_a, (size) * sizeof(double), cudaMemcpyDeviceToHost);
    if (cuda_error != cudaSuccess) {
        goto Error;
    }
    cuda_error = cudaMemcpy(b, d_b, (size) * sizeof(double), cudaMemcpyDeviceToHost);
    if (cuda_error != cudaSuccess) {
        goto Error;
    }
    cuda_error = cudaMemcpy(c, d_c, (size) * sizeof(double), cudaMemcpyDeviceToHost);
    if (cuda_error != cudaSuccess) {
        goto Error;
    }
    cuda_error = cudaMemcpy(x, d_x, (size) * sizeof(double), cudaMemcpyDeviceToHost);
    if (cuda_error != cudaSuccess) {
        goto Error;
    }
    cuda_error = cudaMemcpy(y, d_y, (size) * sizeof(double), cudaMemcpyDeviceToHost);
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