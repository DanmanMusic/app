# Danmans Virtual Ticket App

This repository contains the source code for the Danmans Music Store Virtual Ticket and Rewards application.

## Project Goal

The primary goal of this application is to provide an engaging and motivating system for music students at Danmans to track their practice progress and earn virtual tickets redeemable for rewards. This system aims to complement the existing physical ticket system, particularly for students saving towards larger goals like musical instruments. The app focuses on increasing student motivation, fostering a positive learning environment, and encouraging consistent practice habits through a rewarding experience.

## Key Features

The application supports multiple user roles with distinct capabilities:

*   **Admin (Store Manager):** Full control over user management (including PINs), rewards catalog, task library, challenge creation (TBD), and ticket adjustments/redemptions.
*   **Teacher (Danmans Employee):** Assigns tasks to students, verifies task completion, awards tickets, and manages PINs for their linked students. Can view student progress and potentially create challenges (TBD).
*   **Student (Music Student):** Views assigned tasks (including accepted challenges, TBD), marks tasks as complete, tracks virtual ticket balance, views available challenges (TBD), sets reward goals, and browses the rewards catalog. Logs in using an identifier and PIN.
*   **Parent (of Student):** Can link to one or more children's profiles, monitor their progress, mark tasks complete on their behalf, and view their ticket balance and history. Logs in using their child's identifier and PIN.

Core functionalities include:

*   Virtual ticket tracking and balance display.
*   Task assignment, completion, and verification workflow with flexible points awarding.
*   (Potentially TBD) Challenge system where students can accept optional tasks.
*   A browsable rewards catalog (also visible publicly).
*   Ticket transaction history.
*   Public announcements, including potential celebrations for major reward redemptions.
*   A simple PIN-based login process for Teacher, Students and Parent users.

## Documentation

For a detailed breakdown of user roles, workflows, and feature specifications, please refer to:

*   [SPECIFICATION.md](./SPECIFICATION.md)

For the technical database schema design (target: Supabase/PostgreSQL), see:

*   [MODEL.md](./MODEL.md)

For planned development tasks, pending decisions, and future ideas, please see:

*   [TODO.md](./TODO.md)