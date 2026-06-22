# Quick Prompt

## Problem
Planet visualization shows different apps than Applications page in DeskFlow app.

## Why
- Planet receives `logs` prop (includes ALL apps including browsers)
- Applications page receives `appStats` prop (excludes browser apps)
- They use different data sources

## Fix
Make both views use the SAME filtered data:
1. Use `filteredLogs` for planet (already filters by period)
2. Compute stats from the SAME `filteredLogs` for Applications page
3. Ensure both exclude browser apps: Chrome, Firefox, Edge, etc.

## Files to check
- `src/App.tsx` - where `logs` and `appStats` are passed to components
- `src/components/OrbitSystem.tsx` - receives `logs`
- `src/pages/StatsPage.tsx` - receives `appStats`

## Test
Select different timeline periods (Today/Week/Month/All) - both views should show same apps.