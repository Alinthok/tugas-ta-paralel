#include "tridiag_solver.h"

// input is array at global memory, output d_x
void solve_cr(double* d_a, double* d_b, double* d_c, double* d_x, double* d_y)
{
    int depth = int(log2(size)) - 1;

    // handle malloc at global memory
    double* dd_a, * dd_b, * dd_c, * dd_y;
    cudaMalloc(&dd_a, (size - 1) * sizeof(double));
    cudaMalloc(&dd_b, (size) * sizeof(double));
    cudaMalloc(&dd_c, (size - 1) * sizeof(double));
    cudaMalloc(&dd_y, (size) * sizeof(double));

    cudaMemcpy(dd_a, d_a, (size - 1) * sizeof(double), cudaMemcpyDeviceToDevice);
    cudaMemcpy(dd_b, d_b, (size) * sizeof(double), cudaMemcpyDeviceToDevice);
    cudaMemcpy(dd_c, d_c, (size - 1) * sizeof(double), cudaMemcpyDeviceToDevice);
    cudaMemcpy(dd_y, d_y, (size) * sizeof(double), cudaMemcpyDeviceToDevice);

    // forward reduction
    for (int i = 0; i < depth; i++)
    {
        int thread_count = (size / pow(2, i + 1));
        int block_count = 1;
        if (thread_count > block_size) {
            block_count = ceil(thread_count / block_size);
            thread_count = block_size;
        }

        forward_reduce<<<block_count, thread_count>>>(dd_a, dd_b, dd_c, d_x, dd_y, i);
        cudaDeviceSynchronize();
    }

    // elimination
    elimination<<<1, 1>>>(dd_a, dd_b, dd_c, d_x, dd_y);
    cudaDeviceSynchronize();

    // backward subtitution
    for (int i = depth - 1; i >= 0; i--)
    {
        int thread_count = (size / pow(2, i + 1));
        int block_count = 1;
        if (thread_count > block_size) {
            block_count = ceil(thread_count / block_size);
            thread_count = block_size;
        }

        backward_subs << <block_count, thread_count >> > (dd_a, dd_b, dd_c, d_x, dd_y, i);
        cudaDeviceSynchronize();
    }

    cudaFree(dd_a);
    cudaFree(dd_b);
    cudaFree(dd_c);
    cudaFree(dd_y);
}

__global__ void forward_reduce(double* a, double* b, double* c, double* x, double* y, int depth)
{
    int i = blockIdx.x * block_size + threadIdx.x;
    int idx = ((1 << depth + 1) - 1) + (i * (1 << depth + 1));
    int offset = 1 << depth;

    if (idx == (1 << depth + 1) - 1)
    {
        double alpha = -a[idx - 1] / b[idx - offset];
        double beta = -c[idx] / b[idx + offset];
        a[idx - 1] = 0;
        b[idx] = b[idx] + alpha * c[idx - offset] + beta * a[idx + offset - 1];
        c[idx] = beta * c[idx + offset];
        y[idx] = y[idx] + alpha * y[idx - offset] + beta * y[idx + offset];
    }
    else if (idx == size - 1)
    {
        double alpha = -a[idx - 1] / b[idx - offset];
        a[idx - 1] = alpha * a[idx - offset - 1];
        b[idx] = b[idx] + alpha * c[idx - offset];
        y[idx] = y[idx] + alpha * y[idx - offset];
    }
    else
    {
        double alpha = -a[idx - 1] / b[idx - offset];
        double beta = -c[idx] / b[idx + offset];
        a[idx - 1] = alpha * a[idx - offset - 1];
        b[idx] = b[idx] + alpha * c[idx - offset] + beta * a[idx + offset - 1];
        c[idx] = beta * c[idx + offset];
        y[idx] = y[idx] + alpha * y[idx - offset] + beta * y[idx + offset];
    }
}

__global__ void elimination(double* a, double* b, double* c, double* x, double* y)
{
    // elimination to get X(n / 2 - 1) and X(n - 1)
    int idx_mid = int(size / 2) - 1;
    y[idx_mid] = y[idx_mid] / b[idx_mid];
    c[idx_mid] = c[idx_mid] / b[idx_mid];
    x[size - 1] = (y[size - 1] - (a[size - 2] * y[idx_mid])) / (b[size - 1] - (a[size - 2] * c[idx_mid]));
    x[idx_mid] = y[idx_mid] - c[idx_mid] * x[size - 1];
}

__global__ void backward_subs(double* a, double* b, double* c, double* x, double* y, int depth)
{
    int i = blockIdx.x * block_size + threadIdx.x;
    if (depth == 0)
    {
        int idx = i * 2;
        if (idx == 0)
        {
            x[idx] = (y[idx] - c[idx] * x[idx + 1]) / b[idx];
        }
        else
        {
            x[idx] = (y[idx] - a[idx - 1] * x[idx - 1] - c[idx] * x[idx + 1]) / b[idx];
        }
    }
    else
    {
        int idx = ((1 << depth) - 1) + i * (1 << depth + 1);
        int offset = (1 << depth);

        x[idx] = (y[idx] - a[idx - 1] * x[idx - offset] - c[idx] * x[idx + offset]) / b[idx];
    }
}
