# 📅 Event Scheduler

<div align="center">

An intuitive web-based scheduler application for managing multi-location events with participant tracking and export capabilities.

[![Angular](https://img.shields.io/badge/Angular-18-DD0031?style=flat&logo=angular)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Features](#-features) • [Getting Started](#-getting-started) • [Usage](#-usage) • [Export Options](#-export-options) • [Tech Stack](#-tech-stack)

</div>

---

## ✨ Features

### 📍 **Multi-Location Scheduling**

- Create and manage multiple locations/rooms/stages (columns)
- Drag-and-drop reordering of locations
- Visual organization of concurrent events

### 👥 **Participant Management**

- Add and manage participants across all events
- Assign multiple participants to each task
- Track participant schedules and workload
- Prevent scheduling conflicts for the same participant
- Detailed participant statistics with task breakdown

### 📊 **Smart Scheduling**

- Multiple projects
- Drag-and-drop task creation and repositioning
- Resize tasks to adjust duration
- Visual time-based calendar view
- Adjustable interval precision
- Time conflict detection for participants

### 💾 **Data Persistence**

- Automatic local storage saving
- Import/Export configurations via base64-encoded URLs
- Share schedules with team members easily

### 📥 **Powerful Export Options**

- **Screenshot Export**: Capture entire schedule as PNG
- **Bulk Export**: Download all participant schedules as ZIP of individual PDFs with task details

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/davidrojom/scheduler.git
   cd scheduler
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm start
   ```

4. **Open your browser**
   ```
   Navigate to http://localhost:4200
   ```

### Available Scripts

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `npm start`          | Start dev server on localhost:4200               |
| `npm run start:host` | Start dev server accessible on network (0.0.0.0) |
| `npm run build`      | Production build to `dist/scheduler`             |
| `npm run watch`      | Development build with watch mode                |
| `npm test`           | Run Karma/Jasmine tests                          |

---

## 📖 Usage

### Creating Your First Schedule

1. **Add Locations (Columns)**

   - Click the "Add Column" button
   - Enter a name (e.g., "Main Stage", "Room A", "Workshop Area")
   - Drag columns to reorder them

2. **Add Participants**

   - Click "Manage Participants"
   - Add participant names to your project

3. **Create Tasks**

   - Click on the calendar to create a new task
   - Set the task title
   - Assign participants from the dropdown
   - Adjust time by dragging edges or moving the entire block

4. **Manage Your Schedule**
   - Drag tasks between columns to reassign locations
   - Resize tasks to change duration
   - Edit tasks by clicking on them
   - Delete tasks or participants as needed

### Participant Statistics

View detailed participant workload:

- Total time scheduled per participant
- Complete task breakdown with times and locations
- Task count and distribution
- Remove participants from specific tasks
- Delete participants entirely

### Import/Export Workflow

**Export a Schedule:**

1. Click "Share" → "Export Configuration"
2. Copy the generated base64 code
3. Share with team members

**Import a Schedule:**

1. Click "Share" → "Import Configuration"
2. Paste the base64 code
3. Your schedule is loaded instantly

**Download Options:**

- **Screenshot**: Quick visual reference of entire schedule
- **PDF Export**: Individual participant schedules bundled in ZIP

---

## 📥 Export Options

### Screenshot Export

- Captures the entire schedule grid as PNG
- Perfect for quick sharing and presentations
- High-resolution output

### PDF Export (Individual Participants)

- One PDF per participant showing their assigned tasks
- Includes task names, times, locations, and durations
- Bundled in a ZIP file

### Share Configuration

- Generates a shareable base64 code
- No server required - all data in the link

---

## 🛠 Tech Stack

### Core Framework

- **Angular 18** - Modern web framework with standalone components
- **TypeScript 5.5** - Type-safe development
- **RxJS** - Reactive state management

### UI & Styling

- **TailwindCSS** - Utility-first CSS framework
- **Bootstrap 5** - Component library
- **ng-bootstrap** - Angular Bootstrap components
- **SCSS** - Advanced styling

### Scheduling & Calendar

- **angular-calendar-scheduler** - Calendar component with drag-and-drop
- **date-fns** - Modern date manipulation
- **angularx-flatpickr** - Date picker

### Export & PDF Generation

- **@pdfme/generator** - PDF generation engine
- **html-to-image** - Screenshot capture
- **@zip.js/zip.js** - ZIP file creation

### Storage & State

- **LocalStorage** - Client-side data persistence
- **BehaviorSubject** - Reactive state management pattern

---

## 🔮 Future Enhancements

- [x] Custom time ranges and intervals
- [x] Multiple project support
- [x] Mobile-responsive improvements
- [ ] Real-time collaboration via WebSockets
- [ ] Dark mode support
- [ ] Undo/Redo functionality
- [ ] Task color customization

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Angular](https://angular.io/)
- Calendar component by [angular-calendar-scheduler](https://github.com/michelebombardi/angular-calendar-scheduler)
- PDF generation by [@pdfme](https://pdfme.com/)
- Icons from [Heroicons](https://heroicons.com/)
