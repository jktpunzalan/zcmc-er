<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\ErVisit;
use App\Models\ClinicalNote;

class ClinicalNotesSeeder extends Seeder
{
    public function run(): void
    {
        $visits = ErVisit::with(['patient'])->get();

        foreach ($visits as $visit) {
            $existingNotes = ClinicalNote::where('visit_id', $visit->visit_id)->count();

            if ($existingNotes > 0) {
                continue;
            }

            $notes = [
                [
                    'note_type' => 'Physician',
                    'subjective' => sprintf(
                        'Patient %s reports %s with intensity level 8/10 lasting approximately %s.',
                        $visit->patient?->first_name,
                        strtolower($visit->chief_complaint ?? 'multiple concerns'),
                        $visit->arrival_mode === 'Ambulance' ? '2 hours' : '4 hours'
                    ),
                    'objective' => 'Vital signs stable. ECG performed showing mild ST elevation. Breath sounds diminished at bases. Pupils equal and reactive.',
                    'assessment' => 'Acute coronary syndrome suspected. Differential includes pulmonary embolism versus GI causes. Risk factors present for cardiac etiology.',
                    'plan' => 'Order serial cardiac enzymes, administer aspirin and nitroglycerin, begin oxygen therapy at 2L/min. Consult cardiology for further evaluation.',
                    'created_by' => 'HW001',
                ],
                [
                    'note_type' => 'Nursing',
                    'subjective' => 'Patient expresses anxiety about current condition but denies additional pain beyond chief complaint.',
                    'objective' => 'IV line established in left antecubital fossa. Continuous cardiac monitoring initiated. Pain scale reassessed at 5/10 after medication.',
                    'assessment' => 'Patient resting but anxious. Monitoring closely for changes in vital signs and response to treatment.',
                    'plan' => 'Continue monitoring every 15 minutes, provide patient education on procedures, update physician with any changes.',
                    'created_by' => 'HW002',
                ],
            ];

            foreach ($notes as $note) {
                ClinicalNote::create([
                    'note_id' => (string) Str::uuid(),
                    'visit_id' => $visit->visit_id,
                    ...$note,
                ]);
            }
        }
    }
}
