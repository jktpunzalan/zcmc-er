# ZCMC Emergency Room Management System

A comprehensive emergency room management system built with Laravel (backend) and React.js (frontend), adapted from the ZCMC Employees' Clinic system.

## 🚨 System Overview

This Emergency Room Management System provides a complete solution for managing ER operations including:
- Patient registration and triage
- Real-time ER visit tracking
- Vital signs monitoring
- Diagnostic order management
- Healthcare worker management
- Comprehensive reporting and analytics

### Key Features

- **Patient Management**: Integration with Hospital Information System (HIS) for patient data
- **Triage System**: 5-level triage categorization (ESI-based)
- **Real-time Dashboard**: Live monitoring of ER status and patient flow
- **Diagnostic Management**: Order and track laboratory, radiology, and other diagnostic tests
- **Vital Signs Tracking**: Record and monitor patient vital signs
- **Healthcare Worker Management**: Integration with HRIS for staff data
- **Reporting**: Comprehensive analytics and operational reports

## 🏗️ Technology Stack

### Backend
- **Laravel 10.x** - PHP framework
- **MySQL 8.0** - Database
- **Laravel Sanctum** - API authentication
- **Laravel CORS** - Cross-origin resource sharing

### Frontend
- **React 18** - JavaScript library
- **React Router v6** - Routing
- **Tailwind CSS** - Styling
- **React Query** - Data fetching and caching
- **React Hook Form** - Form management
- **Recharts** - Data visualization
- **Lucide React** - Icons

## 📋 Prerequisites

- PHP >= 8.1
- Composer
- Node.js >= 16
- MySQL >= 8.0
- XAMPP (recommended for Windows)

## 🚀 Installation

### Backend Setup

1. Navigate to the project directory:
```bash
cd C:\xampp\htdocs\zcmc-emergency-room
```

2. Install PHP dependencies:
```bash
composer install
```

3. Configure environment:
```bash
cp .env.example .env
```

4. Generate application key:
```bash
php artisan key:generate
```

5. Configure database in `.env`:
```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=emergency_room
DB_USERNAME=root
DB_PASSWORD=
```

6. Run migrations:
```bash
php artisan migrate
```

7. Start the Laravel development server:
```bash
php artisan serve
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The application will be available at:
- Backend API: http://localhost:8000
- Frontend: http://localhost:3000

## 🏥 System Architecture

### Database Schema
The system uses a comprehensive database structure including:
- **Patients**: Integrated with HIS for patient demographics
- **Healthcare Workers**: Integrated with HRIS for staff management
- **ER Visits**: Core visit tracking with status management
- **Triage Assessments**: 5-level ESI-based triage system
- **Vital Signs**: Complete vital sign monitoring
- **Diagnostic Orders & Results**: Laboratory, radiology, and other tests
- **Clinical Notes**: SOAP notes and progress documentation
- **Medications**: Drug administration tracking
- **Billing**: Insurance and payment management

### API Endpoints
Main API routes include:
- `/api/patients` - Patient management
- `/api/healthcare-workers` - Staff management
- `/api/er-visits` - ER visit operations
- `/api/triage` - Triage assessments
- `/api/vital-signs` - Vital signs recording
- `/api/diagnostics` - Diagnostic order management

## 👥 User Roles

1. **Emergency Physician** - Full access to patient care functions
2. **ER Nurse** - Patient care and vital signs management
3. **Triage Nurse** - Triage assessment and patient prioritization
4. **ER Admin** - Administrative and reporting functions

## 🔒 Security Features

- Token-based authentication using Laravel Sanctum
- Role-based access control
- CORS configuration for secure API access
- Input validation and sanitization
- SQL injection protection

## 📊 Key Functionalities

### Patient Registration
- Quick registration for new patients
- Integration with existing HIS records
- Emergency contact management

### Triage System
- 5-level triage classification:
  - Level 1: Resuscitation (Immediate)
  - Level 2: Emergent (10 minutes)
  - Level 3: Urgent (30 minutes)
  - Level 4: Less Urgent (60 minutes)
  - Level 5: Non-Urgent (120 minutes)

### Real-time Monitoring
- Active visits dashboard
- Bed occupancy tracking
- Average wait time monitoring
- Critical patient alerts

### Reporting & Analytics
- Visit statistics
- Triage level distribution
- Hourly visit patterns
- Average wait times by triage level
- Arrival mode analysis

## 🔧 Configuration

### CORS Settings
Configure allowed origins in `config/cors.php`:
```php
'allowed_origins' => ['http://localhost:3000']
```

### API Authentication
Configure Sanctum in `config/sanctum.php` for API token management.

## 📝 License

This project is proprietary software developed for ZCMC Emergency Room operations.

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
