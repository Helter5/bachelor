"""
Spustenie všetkých sync testov.
Použitie (v Docker kontajneri):
    docker exec wf-api python run_tests.py
    docker exec wf-api python run_tests.py -v
    docker exec wf-api python run_tests.py -v --tb=short
"""
import sys
import pytest

if __name__ == "__main__":
    args = ["tests/", *sys.argv[1:]]
    sys.exit(pytest.main(args))
