# Start from Python 3.9
FROM python:3.9

# Set up a new user named "user" with user ID 1000
RUN useradd -m -u 1000 user

# Switch to the "user" user
USER user

# Set home to the user's home directory
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Set the working directory to the user's home directory
WORKDIR $HOME/app

# Copy the current directory contents into the container at $HOME/app setting the owner to the user
COPY --chown=user . $HOME/app

# Install requirements
# Note: We are installing everything directly as before
RUN pip install --no-cache-dir fastapi uvicorn[standard] sqlmodel python-multipart emails apscheduler requests

# Make port 7860 available to the world outside this container
EXPOSE 7860

# Run with host 0.0.0.0 and port 7860 (Standard for Hugging Face Spaces)
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
