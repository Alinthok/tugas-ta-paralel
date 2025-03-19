#pragma once

#include "cuda_runtime.h"
#include "device_launch_parameters.h"
#include <math.h>
#include <stdio.h>
#include <iostream>

const int size = 4096; // matrix size harus 2^n
const int block_size = 512;

void solve_cr(double* a, double* b, double* c, double* x, double* y);
__global__ void forward_reduce(double* a, double* b, double* c, double* x, double* y, int depth);
__global__ void elimination(double* a, double* b, double* c, double* x, double* y);
__global__ void backward_subs(double* a, double* b, double* c, double* x, double* y, int depth);
