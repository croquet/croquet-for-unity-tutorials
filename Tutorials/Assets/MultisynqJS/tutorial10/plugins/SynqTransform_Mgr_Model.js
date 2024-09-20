
import { Model } from '@croquet/croquet';

export class SynqTransform_Mgr_Model extends Model {
  get gamePawnType() { return '' }
  init(options) {
    super.init(options)
    this.subscribe('Xform', 'setPos1', this.posChg)
    this.subscribe('Xform', 'setRot1', this.rotChg)
    this.subscribe('Xform', 'setScl1', this.sclChg)
    console.log('### <color=#44ff44>TransformMgrModel.init() <<<<<<<<<<<<<<<<<<<<< </color>')
  }
  posChg(msg) { this.publish('Xform', 'setPos2', msg) }
  rotChg(msg) { this.publish('Xform', 'setRot2', msg) }
  sclChg(msg) { this.publish('Xform', 'setScl2', msg) }
}
SynqTransform_Mgr_Model.register('TransformMgrModel')
