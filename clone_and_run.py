#!/usr/bin/env python3

import os
import subprocess
import sys
import time

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_status(message, color=Colors.BLUE):
    """Print a status message with color."""
    print(f"{color}{message}{Colors.ENDC}")

def run_command(command, cwd=None, error_message="Command failed"):
    """Run a shell command and handle errors."""
    try:
        print_status(f"Running: {' '.join(command)}", Colors.YELLOW)
        result = subprocess.run(command, cwd=cwd, check=True, 
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                              text=True)
        return result.stdout
    except subprocess.CalledProcessError as e:
        print_status(f"{error_message}: {e}", Colors.RED)
        print_status(f"Error output:\n{e.stderr}", Colors.RED)
        sys.exit(1)
    except Exception as e:
        print_status(f"Unexpected error: {str(e)}", Colors.RED)
        sys.exit(1)

def check_git_installed():
    """Check if git is installed on the system."""
    try:
        subprocess.run(["git", "--version"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def clone_repository(repo_url, target_dir):
    """Clone the GitHub repository."""
    if os.path.exists(target_dir):
        print_status(f"Directory {target_dir} already exists. Removing it...", Colors.YELLOW)
        if os.name == 'nt':  # Windows
            run_command(["rmdir", "/s", "/q", target_dir])
        else:  # Unix/Linux/MacOS
            run_command(["rm", "-rf", target_dir])
    
    print_status(f"Cloning repository {repo_url} into {target_dir}...", Colors.BLUE)
    run_command(["git", "clone", repo_url, target_dir], error_message="Failed to clone repository")
    print_status("Repository cloned successfully!", Colors.GREEN)

def check_file_exists(path, filename):
    """Check if a specific file exists in the directory."""
    file_path = os.path.join(path, filename)
    return os.path.isfile(file_path)

def detect_project_type(project_dir):
    """Detect the type of project based on files present."""
    if check_file_exists(project_dir, "package.json"):
        return "nodejs"
    elif check_file_exists(project_dir, "requirements.txt"):
        return "python"
    elif check_file_exists(project_dir, "Gemfile"):
        return "ruby"
    elif check_file_exists(project_dir, "pom.xml") or check_file_exists(project_dir, "build.gradle"):
        return "java"
    elif check_file_exists(project_dir, "go.mod"):
        return "go"
    else:
        # Check for common files in subdirectories
        for root, _, files in os.walk(project_dir):
            for file in files:
                if file == "package.json":
                    return "nodejs"
                elif file == "requirements.txt":
                    return "python"
            
    return "unknown"

def install_dependencies(project_dir, project_type):
    """Install project dependencies based on project type."""
    print_status(f"Installing dependencies for {project_type} project...", Colors.BLUE)
    
    if project_type == "nodejs":
        run_command(["npm", "install"], cwd=project_dir, 
                   error_message="Failed to install Node.js dependencies")
    elif project_type == "python":
        run_command([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                   cwd=project_dir, error_message="Failed to install Python dependencies")
    elif project_type == "ruby":
        run_command(["bundle", "install"], cwd=project_dir, 
                   error_message="Failed to install Ruby dependencies")
    elif project_type == "java":
        if check_file_exists(project_dir, "pom.xml"):
            run_command(["mvn", "install", "-DskipTests"], cwd=project_dir, 
                       error_message="Failed to install Java dependencies with Maven")
        else:
            run_command(["gradle", "build", "-x", "test"], cwd=project_dir, 
                       error_message="Failed to install Java dependencies with Gradle")
    elif project_type == "go":
        run_command(["go", "mod", "download"], cwd=project_dir, 
                   error_message="Failed to install Go dependencies")
    else:
        print_status("Could not determine how to install dependencies. Skipping this step.", Colors.YELLOW)
        print_status("You may need to install dependencies manually.", Colors.YELLOW)
        return False
    
    print_status("Dependencies installed successfully!", Colors.GREEN)
    return True

def find_run_commands(project_dir, project_type):
    """Determine how to run the project based on its type."""
    if project_type == "nodejs":
        package_json_path = os.path.join(project_dir, "package.json")
        if os.path.exists(package_json_path):
            import json
            with open(package_json_path, 'r') as f:
                try:
                    package_data = json.load(f)
                    scripts = package_data.get('scripts', {})
                    
                    # Check for common run scripts
                    if 'start' in scripts:
                        return ["npm", "start"]
                    elif 'dev' in scripts:
                        return ["npm", "run", "dev"]
                    elif 'serve' in scripts:
                        return ["npm", "run", "serve"]
                except json.JSONDecodeError:
                    print_status("Error parsing package.json", Colors.RED)
        
        # Check for common frameworks
        if os.path.exists(os.path.join(project_dir, "angular.json")):
            return ["npm", "run", "start"]
        elif os.path.exists(os.path.join(project_dir, "next.config.js")):
            return ["npm", "run", "dev"]
        
        return ["npm", "start"]  # Default for Node.js projects
    
    elif project_type == "python":
        # Look for common Python entry points
        if os.path.exists(os.path.join(project_dir, "manage.py")):
            return [sys.executable, "manage.py", "runserver", "0.0.0.0:8000"]
        elif os.path.exists(os.path.join(project_dir, "app.py")):
            return [sys.executable, "app.py"]
        elif os.path.exists(os.path.join(project_dir, "main.py")):
            return [sys.executable, "main.py"]
        
        # Look for Flask or FastAPI applications
        for root, _, files in os.walk(project_dir):
            for file in files:
                if file.endswith(".py"):
                    with open(os.path.join(root, file), 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        if "Flask(__name__)" in content or "FastAPI(" in content:
                            relative_path = os.path.relpath(os.path.join(root, file), project_dir)
                            return [sys.executable, relative_path]
        
        # Default fallback for Python
        python_files = [f for f in os.listdir(project_dir) if f.endswith('.py')]
        if python_files:
            return [sys.executable, python_files[0]]
    
    return None

def run_project(project_dir, project_type):
    """Run the project."""
    print_status("Preparing to run the project...", Colors.BLUE)
    
    # Try to find an appropriate run command
    run_command = find_run_commands(project_dir, project_type)
    
    if run_command:
        print_status(f"Starting the application with: {' '.join(run_command)}", Colors.GREEN)
        try:
            # Use Popen instead of run to not block
            process = subprocess.Popen(
                run_command, 
                cwd=project_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            
            print_status("Application started! Showing output below:", Colors.GREEN)
            print_status("-" * 50, Colors.BLUE)
            
            try:
                # Print output in real-time
                for line in iter(process.stdout.readline, ''):
                    print(line, end='')
                
                process.stdout.close()
                return_code = process.wait()
                
                if return_code != 0:
                    print_status(f"Application exited with code {return_code}", Colors.RED)
                    return False
            except KeyboardInterrupt:
                process.terminate()
                print_status("\nApplication terminated by user.", Colors.YELLOW)
                return True
                
        except Exception as e:
            print_status(f"Error running the application: {str(e)}", Colors.RED)
            return False
    else:
        print_status("Could not determine how to run this project.", Colors.RED)
        print_status("Please check the project's documentation for run instructions.", Colors.YELLOW)
        return False
    
    return True

def main():
    """Main function to execute the script."""
    print_status("=== GitHub Repository Cloner and Runner ===", Colors.HEADER + Colors.BOLD)
    
    # Check if git is installed
    if not check_git_installed():
        print_status("Git is not installed or not in PATH. Please install Git and try again.", Colors.RED)
        sys.exit(1)
    
    # Repository details
    repo_url = "https://github.com/Beast000009/defiprogess"
    target_dir = "defiprogess"
    
    # Clone the repository
    clone_repository(repo_url, target_dir)
    
    # Detect project type
    project_type = detect_project_type(target_dir)
    print_status(f"Detected project type: {project_type}", Colors.BLUE)
    
    # Install dependencies if possible
    if project_type != "unknown":
        install_dependencies(target_dir, project_type)
    
    # Run the project
    success = run_project(target_dir, project_type)
    
    if success:
        print_status("\nProject setup and execution completed successfully!", Colors.GREEN + Colors.BOLD)
    else:
        print_status("\nProject setup completed, but there might be issues with running it.", Colors.YELLOW + Colors.BOLD)
        print_status("Please check the project's documentation for specific instructions.", Colors.YELLOW)
    
    print_status("\nThe project has been cloned to the directory:", Colors.BLUE)
    print_status(os.path.abspath(target_dir), Colors.BLUE)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print_status("\nOperation canceled by user.", Colors.YELLOW)
        sys.exit(0)
    except Exception as e:
        print_status(f"An unexpected error occurred: {str(e)}", Colors.RED)
        sys.exit(1)
