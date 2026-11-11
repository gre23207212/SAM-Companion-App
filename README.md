# SAM Companion App

**Desktop Control & Monitoring System for the Unitree Go2 Robot Dog**

The **SAM Companion App** is a Windows desktop application designed to control, monitor and interact with the **Unitree Go2 robot dog**.

Built using the **Electron Framework**, SAM provides a dedicated interface for robot movement, system monitoring and LiDAR mapping.

The application is currently under active development, with ongoing improvements to functionality, reliability and hardware integration.

---

## Features

- **Robot Control** – Control the Unitree Go2 using a keyboard or compatible gamepad.
- **Monitoring Dashboard** – View available robot information, connection status and system diagnostics.
- **LiDAR Mapping** – Mapping and 3D visualisation capabilities currently under development.
- **Desktop Application** – Windows desktop interface built using Electron.
- **Connection Management** – Connect to compatible Unitree Go2 hardware over supported network connections.
- **Ongoing Development** – Continued improvements to stability, performance and usability.

> **Development Notice:** SAM Companion App is still under development. Some features may be incomplete, experimental or require further testing with physical hardware.

---

## Installation

### Prerequisites

Before running the SAM Companion App from source code, install the following:

| Requirement | Details |
|---|---|
| Operating System | Windows 10 / 11 (64-bit) |
| Node.js | Latest LTS version recommended |
| npm | Included with Node.js |
| Internet Connection | Required to download dependencies |
| Robot | Compatible Unitree Go2 for live functionality |

**Download Node.js:** https://nodejs.org/en/download

After installing Node.js, open PowerShell and verify the installation:

```powershell
node -v
npm -v
```

Both commands should display installed version numbers.

### Step 1 – Download the Source Code

1. Visit the [SAM Companion App GitHub Repository](https://github.com/gre23207212/SAM-Companion-App).
2. Click the green **Code** button.
3. Select **Download ZIP**.
4. Extract the ZIP file to a location on your computer.
5. Open the extracted project folder.

Alternatively, clone the repository using Git:

```powershell
git clone https://github.com/gre23207212/SAM-Companion-App.git
cd SAM-Companion-App
```

### Step 2 – Install Dependencies

Open PowerShell or Command Prompt inside the project folder containing `package.json`.

Run:

```powershell
npm install
```

This downloads and installs the dependencies required to run the application.

The installation process may take several minutes.

### Step 3 – Launch SAM Companion App

Once installation is complete, run:

```powershell
npm start
```

This starts the application using the project's configured development and Electron launch process.

### Step 4 – Build the Windows Application

To package SAM Companion App into a Windows installer, run:

```powershell
npm run dist
```

This starts the configured build process.

Once completed successfully, the generated installer should be available in the build output directory, typically:

```text
release/
```

The exact installer filename and output directory depend on the project's build configuration.

### Updating the Application

When updating to a newer source-code version, download or pull the latest changes and install any updated dependencies:

```powershell
npm install
```

Launch the updated application:

```powershell
npm start
```

Or generate an updated installer:

```powershell
npm run dist
```

> **Important:** Avoid using `npm audit fix --force` without reviewing the dependency changes. It may install incompatible versions and cause build errors.

---

## Connecting to Your Robot

### 1. Prepare the Unitree Go2

1. Turn on your Unitree Go2.
2. Wait for the robot to finish booting.
3. Ensure the robot is in a safe, open environment.
4. Confirm the robot is ready for a connection.

### 2. Connect Your Computer

Connect your computer to the robot's supported network using Ethernet or Wi-Fi.

For compatible setups using the `192.168.123.x` network, the following configuration may be used:

| Setting | Value |
|---|---|
| Computer IP Address | `192.168.123.222` |
| Subnet Mask | `255.255.255.0` |
| Default Gateway | `192.168.123.1` |
| Example Robot IP | `192.168.123.161` |

> **Note:** Verify that these settings match your robot's network configuration before applying them.

### 3. Test the Connection

Open Command Prompt or PowerShell:

```powershell
ping 192.168.123.161
```

If the robot responds, your computer can reach that IP address.

A successful ping does not necessarily confirm that robot control services are available.

### 4. Connect Through SAM

1. Launch **SAM Companion App**.
2. Close or disconnect any conflicting Unitree control sessions.
3. Click **Connect**.
4. Check the connection status.
5. Verify that the robot is responding correctly before attempting movement.

---

## Controls

### Keyboard Controls

| Key | Action |
|---|---|
| W | Move Forward |
| S | Move Backward |
| A | Turn Left |
| D | Turn Right |
| Q | Sidestep Left |
| E | Sidestep Right |
| Spacebar | Send Emergency Stop Command |

### Gamepad Controls

| Input | Action |
|---|---|
| Left Stick | Movement |
| Right Stick | Turning |

> **Safety:** Software stop commands are not a replacement for physical emergency controls or manufacturer safety procedures.

---

## Compatibility

SAM Companion App is designed primarily for the **Unitree Go2 robot dog**.

**Target hardware:**
- Unitree Go2 EDU

The Go2 Air and Go2 Pro consumer models are not currently supported.

Compatibility with other Unitree robots and firmware versions has not been officially verified.

The application can be launched without a connected robot, but live robot functionality requires compatible hardware.

---

## Development Status

**Status: Active Development**

SAM Companion App is an ongoing project, with development currently focused on:

- Robot connection reliability
- Keyboard and gamepad movement controls
- LiDAR mapping and 3D visualisation
- Monitoring and system diagnostics
- Application stability and performance
- User interface improvements
- Physical hardware testing and bug fixes

Features may change as development progresses.

---

## Safety Information

SAM Companion App interacts with physical robotic hardware. Incorrect operation may result in injury or equipment damage.

When using the application:

- Operate the robot in a safe and controlled environment.
- Keep people, animals and obstacles clear of the robot.
- Follow official Unitree safety instructions.
- Supervise the robot whenever it is operating.
- Ensure an appropriate emergency stopping method is available.
- Only connect to hardware you are authorised to operate.

**SAM Companion App is an independent project and is not an official Unitree application.**
