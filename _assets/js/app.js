//= require head
//= require joint
//= require beam
//= require bridge-model
//= require engine
//= require touch-controller
//= require joint-editor
//= require beam-editor

var creationMode = false;

touchController.objectAtPosition = (position) => {
  return renderEngine.objectAtPosition(position);
};

touchController.updateLocation = (object, rawPosition) => {
  if (!object || !object.draggable) {
    return false;
  }

  let position = renderEngine.clipPosition(rawPosition);

  if (creationMode) {
    if (!bridgeModel.temporaryJoint) {
      bridgeModel.temporaryJoint = new Joint(renderEngine);
      bridgeModel.temporaryJoint.position = position;
      bridgeModel.temporaryJoint.moving = true;
      bridgeModel.temporaryBeam = new Beam(object, bridgeModel.temporaryJoint);
    }

    bridgeModel.temporaryJoint.updatePosition(position);
  } else {
    object.updatePosition(position);
    object.moving = true;
  }

  renderEngine.requestUpdate();

  return true;
};

touchController.clicked = (object, position) => {
  if (object) {
    if (object instanceof Joint) {
      beamEditor.disable();
      jointEditor.enableForJoint(object);
    } else if (object instanceof Beam) {
      jointEditor.disable();
      beamEditor.enableForBeam(object);
    }
  } else if (creationMode) {
    let newJoint = new Joint(renderEngine);
    bridgeModel.joints.push(newJoint);
    newJoint.updatePosition(position, {ignoreLock: true});
    renderEngine.requestUpdate();
  }
};

touchController.dragEnded = (object, rawPosition) => {
  let position = renderEngine.clipPosition(rawPosition);
  var overlappedJoint = renderEngine.jointAtPosition(position, object);

  if (creationMode) {
    if (!bridgeModel.temporaryJoint) {
      return;
    }

    bridgeModel.temporaryJoint.updatePosition(position);
    bridgeModel.temporaryJoint.moving = false;

    if (overlappedJoint) {
      if (bridgeModel.temporaryBeam.jointA != overlappedJoint) {
        bridgeModel.temporaryBeam.jointB = overlappedJoint;
        bridgeModel.beams.push(bridgeModel.temporaryBeam);
        bridgeModel.mergeRedundantBeams(bridgeModel.temporaryBeam.jointA,
          overlappedJoint);

        renderEngine.requestUpdate();
      }
    } else {
      bridgeModel.addJoint(bridgeModel.temporaryJoint);
      bridgeModel.beams.push(bridgeModel.temporaryBeam);

      renderEngine.requestUpdate();
    }

    bridgeModel.temporaryBeam = null;
    bridgeModel.temporaryJoint = null;
  } else if (object) {
    object.updatePosition(position);
    object.moving = false;

    if (overlappedJoint) {
      bridgeModel.mergeJoint(overlappedJoint, object);
    }

    renderEngine.requestUpdate();
  }
};

function resizeCanvas() {
  var canvas = document.getElementById('main-canvas');
  var container = document.querySelector('.container');

  canvas.width = container.clientWidth - 20;
  canvas.height = container.clientHeight - 20;
}

window.onload = function() {
  var canvas = document.getElementById('main-canvas');
  resizeCanvas();

  renderEngine.setup(canvas, bridgeModel);
  touchController.setup(renderEngine.canvas);
  jointEditor.setup(renderEngine, bridgeModel);
  beamEditor.setup(renderEngine, bridgeModel);

  window.addEventListener("resize", (event) => {
    resizeCanvas();
    renderEngine.resize();
  });
}
