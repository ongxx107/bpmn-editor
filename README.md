# bpmn-editor

## Table of Contents

- [bpmn-editor](#bpmn-editor)
  - [Table of Contents](#table-of-contents)
  - [About](#about)
  - [Demo](#demo)
  - [Django Backend Installation Guide](#django-backend-installation-guide)
    - [1. Ensure You Have Python 3.10.x Installed](#1-ensure-you-have-python-310x-installed)
    - [2. Create a Virtual Environment](#2-create-a-virtual-environment)
    - [3. Activate the Virtual Environment](#3-activate-the-virtual-environment)
    - [4. Upgrade `pip`](#4-upgrade-pip)
    - [5. Redirect to Django directory](#5-redirect-to-django-directory)
    - [6. Install Required Packages](#6-install-required-packages)
    - [7. Apply Migrations](#7-apply-migrations)
    - [8. Create a Superuser (Optional)](#8-create-a-superuser-optional)
    - [9. Run the Development Server](#9-run-the-development-server)
    - [10. Accessing the Admin Panel (Optional)](#10-accessing-the-admin-panel-optional)
    - [11. Stopping the Development Server](#11-stopping-the-development-server)
    - [12. Deactivating the Virtual Environment](#12-deactivating-the-virtual-environment)
  - [Angular Frontend Installation Guide](#angular-frontend-installation-guide)
    - [1. Install Node.js & npm](#1-install-nodejs--npm)
    - [2. Install Angular CLI](#2-install-angular-cli)
    - [3. Navigate to the Angular Frontend](#3-navigate-to-the-angular-frontend)
    - [4. Install Frontend Dependencies](#4-install-frontend-dependencies)
    - [5. Run the Angular Dev Server](#5-run-the-angular-dev-server)
    - [6. Stopping the Development Server](#6-stopping-the-development-server)
  - [Notes](#notes)
  - [License](#license)

## About

This is SUMM AI take-home assignment BPMN editor. 
It uses a **Django** backend with [**Django Channels**](https://channels.readthedocs.io/en/latest/) for WebSocket-based real-time server, and an **Angular** frontend framework that renders and edits BPMN diagrams using **bpmn-js**. 
Please `Clone` or `Download` the Repository before proceeding to the next step.

## Demo

A short demo video is included as `demo.mp4` in the project root directory.
You can open this file locally to see the BPMN editor in action.

## Django Backend Installation Guide

To set up this Django project on your local machine, please follow the steps below:

### 1. Ensure You Have Python 3.10.x Installed

Make sure you have Python 3.10.x installed on your system. You can verify your Python version by running:

```bash
py -0p
```

If Python 3.10.x is not installed, you can download it from the [official Python website](https://www.python.org/downloads/).

### 2. Create a Virtual Environment

It is recommended to create a separate virtual environment to manage dependencies. Run the following command to create a virtual environment:

```bash
py -3.10 -m venv <yourenvname>
```

This will create a virtual environment named `yourenvname`.

### 3. Activate the Virtual Environment

Activate the virtual environment using the following command:

- **For Windows:**

  ```bash
  .\yourenvname\Scripts\activate
  ```

- **For macOS/Linux:**

  ```bash
  source yourenvname/bin/activate
  ```

### 4. Upgrade `pip`

Before installing the required packages, it's a good practice to ensure `pip` is up to date. Run the following command:

```bash
pip install --upgrade pip
```

### 5. Redirect to Django directory

With the virtual environment activated, redirect to Django project directory. Run the following command:

```bash
cd bpmn-editor\backend
```

### 6. Install Required Packages

Install the required packages specified in `requirements.txt` by running:

```bash
pip install -r requirements.txt
```

### 7. Apply Migrations

Before running the application, you need to apply the database migrations to set up the necessary tables in your database. Run the following command:

```bash
python manage.py makemigrations
```
and
```bash
python manage.py migrate
```

This will apply all pending migrations and set up the database schema.

### 8. Create a Superuser (Optional)

To access the Django admin panel, you may want to create a superuser. You can do this by running:

```bash
python manage.py createsuperuser
```

Follow the prompts to set a username, email, and password for the superuser.

### 9. Run the Development Server

Now that everything is set up, you can start the Django development server to run the project locally. Use the following command:

```bash
python manage.py runserver
```

By default, the server will start at `http://127.0.0.1:8000/`.

### 10. Accessing the Admin Panel (Optional)

If you've created a superuser, you can access the Django admin panel by navigating to:

```url
http://127.0.0.1:8000/admin/
```

Log in using the superuser credentials you created earlier.

### 11. Stopping the Development Server

To stop the server, you can press `Ctrl + C` or `Command + C` in the terminal where the server is running.

### 12. Deactivating the Virtual Environment

When you're done working on the project, deactivate the virtual environment by running:

```bash
deactivate
```

This will return you to your normal shell environment.

## Angular Frontend Installation Guide

To set up the Angular frontend on your local machine, please follow the steps below:

### 1. Install Node.js & npm

Check versions:

```bash
node -v
npm -v
```

If not installed, download Node.js LTS from the [official Node.js website](https://nodejs.org/) and then re-run the version commands.

### 2. Install Angular CLI

Install Angular CLI globally:

```bash
npm install -g @angular/cli
```

### 3. Navigate to the Angular Frontend

From the project root:

```bash
cd bpmn-editor\frontend
```

### 4. Install Frontend Dependencies

```bash
npm install
```

This will create the `node_modules` directory and install all required packages.

### 5. Run the Angular Dev Server

```bash
npm start
```

Once compiled, open:

```
http://localhost:4200/
```

Depending on the routing setup, you may access a specific room with:

```
http://localhost:4200/diagram/default
http://localhost:4200/diagram/room1
```

### 6. Stopping the Development Server

To stop the server, you can press `Ctrl + C` or `Command + C` in the terminal where the server is running.

## Notes

This setup is intended for **local development** only.

## License

This project is provided as part of a **take-home assignment**.