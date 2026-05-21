<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

class EmergencyRoomSeeder extends Seeder
{
    public function run(): void
    {
        // Create Healthcare Workers for each role
        $workers = [
            [
                'worker_id' => 'HW001',
                'hris_id' => 'HRIS001',
                'first_name' => 'John',
                'last_name' => 'Smith',
                'middle_name' => 'A',
                'role' => 'Emergency_Physician',
                'license_no' => 'MD-12345',
                'specialization' => 'Emergency Medicine',
                'is_active' => true,
            ],
            [
                'worker_id' => 'HW002',
                'hris_id' => 'HRIS002',
                'first_name' => 'Sarah',
                'last_name' => 'Johnson',
                'middle_name' => 'B',
                'role' => 'ER_Nurse',
                'license_no' => 'RN-67890',
                'specialization' => 'Emergency Nursing',
                'is_active' => true,
            ],
            [
                'worker_id' => 'HW003',
                'hris_id' => 'HRIS003',
                'first_name' => 'Emily',
                'last_name' => 'Davis',
                'middle_name' => 'C',
                'role' => 'Triage_Nurse',
                'license_no' => 'RN-11223',
                'specialization' => 'Triage',
                'is_active' => true,
            ],
            [
                'worker_id' => 'HW004',
                'hris_id' => 'HRIS004',
                'first_name' => 'Michael',
                'last_name' => 'Wilson',
                'middle_name' => 'D',
                'role' => 'ER_Admin',
                'license_no' => null,
                'specialization' => 'Healthcare Administration',
                'is_active' => true,
            ],
            [
                'worker_id' => 'HW005',
                'hris_id' => 'HRIS005',
                'first_name' => 'Robert',
                'last_name' => 'Brown',
                'middle_name' => 'E',
                'role' => 'Technician',
                'license_no' => 'TECH-44556',
                'specialization' => 'Radiology',
                'is_active' => true,
            ],
        ];

        foreach ($workers as $worker) {
            DB::table('healthcare_workers')->insert([
                ...$worker,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Create corresponding users for authentication
        $users = [
            [
                'name' => 'Dr. John Smith',
                'email' => 'physician@zcmc-er.com',
                'password' => Hash::make('physician123'),
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Sarah Johnson',
                'email' => 'nurse@zcmc-er.com',
                'password' => Hash::make('nurse123'),
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Emily Davis',
                'email' => 'triage@zcmc-er.com',
                'password' => Hash::make('triage123'),
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Michael Wilson',
                'email' => 'admin@zcmc-er.com',
                'password' => Hash::make('admin123'),
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Robert Brown',
                'email' => 'tech@zcmc-er.com',
                'password' => Hash::make('tech123'),
                'email_verified_at' => now(),
            ],
        ];

        foreach ($users as $user) {
            DB::table('users')->insert([
                ...$user,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Create sample patients
        $patients = [
            [
                'patient_id' => 'PT001',
                'his_id' => 'HIS001',
                'first_name' => 'Alice',
                'last_name' => 'Anderson',
                'middle_name' => 'M',
                'sex' => 'Female',
                'birthday' => '1985-05-15',
                'blood_type' => 'O+',
                'contact_number' => '555-0101',
                'address' => '123 Main St, City',
                'emergency_contact_name' => 'Bob Anderson',
                'emergency_contact_number' => '555-0102',
                'insurance_provider' => 'Health Insurance Co',
                'insurance_number' => 'INS123456',
            ],
            [
                'patient_id' => 'PT002',
                'his_id' => 'HIS002',
                'first_name' => 'Charles',
                'last_name' => 'Miller',
                'middle_name' => 'R',
                'sex' => 'Male',
                'birthday' => '1970-08-22',
                'blood_type' => 'A+',
                'contact_number' => '555-0201',
                'address' => '456 Oak Ave, City',
                'emergency_contact_name' => 'Diana Miller',
                'emergency_contact_number' => '555-0202',
                'insurance_provider' => 'MediCare Plus',
                'insurance_number' => 'INS789012',
            ],
        ];

        foreach ($patients as $patient) {
            DB::table('patients')->insert([
                ...$patient,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Create sample ER visits
        $visits = [
            [
                'visit_id' => Str::uuid(),
                'patient_id' => 'PT001',
                'arrival_time' => now()->subHours(2),
                'arrival_mode' => 'Walk-in',
                'visit_type' => 'Emergency',
                'status' => 'Triaged',
                'chief_complaint' => 'Severe chest pain, shortness of breath',
                'assigned_bed' => 'ER-01',
                'attending_physician_id' => 'HW001',
                'primary_nurse_id' => 'HW002',
            ],
            [
                'visit_id' => Str::uuid(),
                'patient_id' => 'PT002',
                'arrival_time' => now()->subHours(1),
                'arrival_mode' => 'Ambulance',
                'visit_type' => 'Urgent',
                'status' => 'In_Treatment',
                'chief_complaint' => 'Head injury from fall',
                'assigned_bed' => 'ER-02',
                'attending_physician_id' => 'HW001',
                'primary_nurse_id' => 'HW002',
            ],
        ];

        foreach ($visits as $visit) {
            DB::table('er_visits')->insert([
                ...$visit,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->command->info('Emergency Room data seeded successfully!');
    }
}
