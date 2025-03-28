// thomas_alg.cpp : This file contains the 'main' function. Program execution begins and ends there.
//

#include <iostream>
#include <chrono>

void solve_tridiag_thomas(double l[], double d[], double u[], double b[], long n);
void generate_diag(double arr[], int size, int val);
void print_arr(double arr[], int size);

long total_time = 0;

int main()
{
    long size = 32 * 32 * 32;

    int run_times = 100;

    for (int i = 0; i < run_times + 1; i++)
    {
        double* a = new double[size - 1];
        double* b = new double[size];
        double* c = new double[size - 1];
        double* y = new double[size];

        generate_diag(a, size - 1, 1);
        generate_diag(b, size, 2);
        generate_diag(c, size - 1, 1);
        generate_diag(y, size, 1);

        // solve tridiagonal matrix using thomas algorithm
        solve_tridiag_thomas(a, b, c, y, size);

        //print_arr(y, size);

        delete[] a;
        delete[] b;
        delete[] c;
        delete[] y;

        // ignore first run
        if (i == 0) { total_time = 0; }
    }

    std::cout << "Avg time = " << (double)total_time / (double)run_times << std::endl;
}

// input lower diag l, diag d, upper diag u, vector b, output di write ke vector b.
void solve_tridiag_thomas(double l[], double d[], double u[], double b[], long n)
{
    // start timer
    std::chrono::steady_clock::time_point begin = std::chrono::steady_clock::now();

    for (int i = 1; i < n; i++)
    {
        u[i - 1] = u[i - 1] / d[i - 1];
        b[i - 1] = b[i - 1] / d[i - 1];
        d[i] = d[i] - l[i - 1] * u[i - 1];
        b[i] = b[i] - l[i - 1] * b[i - 1];
    }

    b[n - 1] = b[n - 1] / d[n - 1];

    for (int i = n - 2; i >= 0; i--)
    {
        b[i] = b[i] - u[i] * b[i + 1];
    }

    // record time
    std::chrono::steady_clock::time_point end = std::chrono::steady_clock::now();
    long time = std::chrono::duration_cast<std::chrono::microseconds>(end - begin).count();
    std::cout << "Running Time = " << time << "[microsec]" << std::endl;
    total_time += time;
}

void generate_diag(double arr[], int size, int val)
{
    for (int i = 0; i < size; i++)
    {
        arr[i] = val;
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