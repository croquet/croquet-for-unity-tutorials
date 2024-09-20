import { StartSession } from '@croquet/unity-bridge';
import { ModelRootWithPlugins, ViewRootWithPlugins } from './ModelRootWithPlugins';    
import { BUILD_IDENTIFIER } from './buildIdentifier';
globalThis.BUILD_IDENTIFIER = BUILD_IDENTIFIER;

StartSession(ModelRootWithPlugins, ViewRootWithPlugins);
