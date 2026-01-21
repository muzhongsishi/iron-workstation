# Use official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . .

# Install any needed packages specified in requirements.txt
# If you don't have a requirements.txt, we install manually (demonstration)
# Ideally, you should have one. Let's assume we need to generate one or install directly.
# For now, we'll install dependencies directly for simplicity in this generated file, 
# but best practice is COPY requirements.txt -> RUN pip install.
RUN pip install --no-cache-dir fastapi uvicorn[standard] sqlmodel python-multipart emails apscheduler requests

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run app.py when the container launches
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
