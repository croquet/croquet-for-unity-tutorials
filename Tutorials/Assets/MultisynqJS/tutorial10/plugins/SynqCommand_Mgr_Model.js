import { Model } from '@croquet/croquet';
        
export class SynqCommand_Mgr_Model extends Model {
    init(options) {
        super.init(options);
        this.subscribe('SynqCommand', 'execute1', this.onSynqCommandExecute);
        console.log('### <color=magenta>SynqCommand_Mgr_Model.init() <<<<<<<<<<<<<<<<<<<<< </color>');
    }
    onSynqCommandExecute(msg) {
        console.log(`<color=blue>[SynqCommand]</color> <color=yellow>JS</color>  <color=magenta>SynqCommand_Mgr_Model.onSynqCommandExecute()</color> msg = <color=white>${JSON.stringify(msg)}</color>`);
        this.publish('SynqCommand', 'execute2', msg);
    }
}
SynqCommand_Mgr_Model.register('SynqCommand_Mgr_Model');
