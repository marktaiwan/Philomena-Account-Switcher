import {NAME, SCRIPT_ID} from './const';
import {initUI} from './ui';

const config = ConfigManager(NAME, SCRIPT_ID);
initUI(config);
