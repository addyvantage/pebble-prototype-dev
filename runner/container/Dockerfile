FROM public.ecr.aws/lambda/python:3.12

RUN dnf install -y \
      nodejs \
      gcc-c++ \
      java-17-amazon-corretto-devel \
    && dnf clean all

COPY handler.py ${LAMBDA_TASK_ROOT}/handler.py

CMD ["handler.handler"]
