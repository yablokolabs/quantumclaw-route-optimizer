# Voiceover script

Voice: Kokoro `bf_emma` (British female). One line per beat.

## qc-title

- QuantumClaw Route Optimizer. A skill for your coding agent.
- It runs three solvers on your delivery problem and hands you one ranked plan.

## qc-prompt

- You give your agent a stop list and your current routes.
- The agent checks the data, runs each solver five times, keeps the best feasible plan, and writes a report.

## qc-problem

- This São Paulo morning has seven stops and three vehicles.
- Your current plan puts fourteen units on a twelve unit truck.

## qc-benchmark

- The skill runs each solver with five fixed seeds.
- The greedy solver leaves one stop unserved on every run, so it drops out.
- Simulated annealing serves all seven stops on all five runs, so it wins.

## qc-routes

- These are the winning routes.
- All seven stops arrive on time, and each vehicle stays within capacity.

## qc-savings

- Compared with your current routes, you cut distance by twenty one percent, cost by fifteen, and C O two by a third.
- These numbers come from the bundled example. Your own data will give different ones.

## qc-cta

- QuantumClaw Route Optimizer is free on Agensi.
- Get the code on GitHub, at yabloko labs slash QuantumClaw.
