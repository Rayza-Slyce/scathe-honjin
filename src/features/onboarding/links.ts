import {
  TORN_CUSTOM_KEY_SELECTIONS,
} from '../../api/torn/onboarding'

const userSelections =
  TORN_CUSTOM_KEY_SELECTIONS.user.join(',')

const factionSelections =
  TORN_CUSTOM_KEY_SELECTIONS.faction.join(',')

export const TORN_CUSTOM_KEY_URL =
  'https://www.torn.com/preferences.php' +
  '#tab=api?step=addNewKey' +
  '&title=SCATHE-HONJIN' +
  `&user=${userSelections}` +
  `&faction=${factionSelections}`

export const FFSCOUTER_POLICY_URL =
  'https://ffscouter.com/'
