# User Testing Checklist

## Test these features:

### Terminal Page
- [ ] Terminal renders and accepts input
- [ ] Split horizontal creates side-by-side panes
- [ ] Split vertical creates stacked panes
- [ ] Close button removes a pane
- [ ] Layout saves after refresh

### IDE Projects Page
- [ ] Add Project button opens modal (no background issues)
- [ ] Can enter project name
- [ ] Can browse and select project path
- [ ] Can select default IDE
- [ ] Add Project saves and closes modal
- [ ] New project appears in list
- [ ] Can remove a project
- [ ] Open button launches project in IDE

### AI Tab
- [ ] Sync AI button works
- [ ] Progress shows during sync
- [ ] Usage data appears after sync
- [ ] Chart displays tokens/cost data

### Database
- [ ] terminal_layouts table exists
- [ ] terminal_presets table exists
- [ ] terminal_sessions table exists
- [ ] projects has health_score column

---

Go test each item. Check the box when it works. Tell me what's broken.