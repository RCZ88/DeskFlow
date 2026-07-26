// Add these to src/preload.ts (around line 1036-1062, alongside existing learn methods)

learnGetDueCards: (args: { deckId?: string; limit?: number }) =>
  ipcRenderer.invoke('learn:getDueCards', args),

learnSubmitCardReview: (args: { cardId: string; rating: number }) =>
  ipcRenderer.invoke('learn:submitCardReview', args),

learnGenerateCards: (args: { deckId: string; nodeContent: string }) =>
  ipcRenderer.invoke('learn:generateCards', args),

learnGetDeckStats: (args: { deckId: string }) =>
  ipcRenderer.invoke('learn:getDeckStats', args),

learnGetStudyHeatmap: (args: { days: number }) =>
  ipcRenderer.invoke('learn:getStudyHeatmap', args),

learnGetConceptMap: (args: { nodeId: string }) =>
  ipcRenderer.invoke('learn:getConceptMap', args),

learnSaveVizState: (args: { vizType: string; vizId: string; state: any }) =>
  ipcRenderer.invoke('learn:saveVizState', args),
