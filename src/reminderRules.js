export const reminderRules = {
  newPlantQuarantine: {
    reminderType: 'new-plant-quarantine',
    title: 'Check new plant quarantine',
    delayDays: 3,
  },
  pestQuarantine: {
    reminderType: 'pest-quarantine',
    title: 'Review pest quarantine',
    delayDays: 3,
  },
  tcAcclimating: {
    reminderType: 'tc-acclimating',
    title: 'Observe TC acclimation',
    delayDays: 2,
  },
  tcVenting: {
    reminderType: 'tc-venting',
    title: 'Check TC venting',
    delayDays: 1,
  },
  lecaTransitioning: {
    reminderType: 'leca-transitioning',
    title: 'Review LECA transition',
    delayDays: 3,
  },
  rehab: {
    reminderType: 'rehab',
    title: 'Check rehab progress',
    delayDays: 3,
  },
  cormPropagation: {
    reminderType: 'corm-propagation',
    title: 'Observe corm or propagation',
    delayDays: 5,
  },
  doNotTouchUntil: {
    reminderType: 'do-not-touch-until',
    title: 'Review do-not-touch date',
    delayDays: 0,
  },
};

export const automaticReminderTypeLabels = Object.fromEntries(
  Object.values(reminderRules).map((rule) => [rule.reminderType, rule.title]),
);
