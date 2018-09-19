let jointEditor = (function(){
  let editor = {};

  let _enabled = false;
  let _domElements = {};
  let _selectedJoint = null;
  let _engine = null;
  let _model = null;
  let _lastParameters = "";

  editor.setup = (engine, model) => {
    _domElements.editor = document.getElementById('position-editor');
    _domElements.xField = document.getElementById('position-editor-x');
    _domElements.yField = document.getElementById('position-editor-y');
    _domElements.forceField = document.getElementById('position-editor-f');
    _domElements.mirrorButton = document.getElementById('position-editor-mir');
    _domElements.lockXButton = document.getElementById('position-editor-lock-x');
    _domElements.lockYButton = document.getElementById('position-editor-lock-y');
    _domElements.showPosButton = document.getElementById('position-editor-show-pos');

    _engine = engine;
    _model = model;
  };

  editor.enableForJoint = (joint) => {
    if (joint == _selectedJoint) {
      return;
    } else if (_enabled) {
      _selectedJoint.selected = false;
    }

    _selectedJoint = joint;
    _selectedJoint.selected = true;
    _engine.requestUpdate();

    let position = _selectedJoint.position;
    let cartesianPosition = _engine.translateToCartesianPosition(position);
    setPositionFields(cartesianPosition);
    setForceField(_selectedJoint.applyForce);

    _enabled = true;
    _domElements.editor.style.display = "block";
    updateEditorPosition();
    updateEditorButtonText();
  };

  editor.disable = () => {
    if (!_enabled) {
      return;
    }

    if (_selectedJoint) {
      _selectedJoint.selected = false;
      _selectedJoint = null;
      _engine.requestUpdate();
    }

    _enabled = false;
    _domElements.editor.style.display = "none";
  };

  var setPositionFields = (cartesianPosition) => {
    _domElements.xField.value = +cartesianPosition[0].toFixed(2);
    _domElements.yField.value = +cartesianPosition[1].toFixed(2);
  };

  var setForceField = (force) => {
    _domElements.forceField.value = +force.toFixed(3);
  };

  var readForceField = () => {
    return parseFloat(_domElements.forceField.value);
  };

  var readPositionFields = () => {
    var x, y;
    let position = _selectedJoint.position;
    let cartesianPosition = _engine.translateToCartesianPosition(position);
    let center = _engine.mirrorCartesianX;

    try {
      let readValue = eval(_domElements.xField.value);
      x = parseFloat(readValue);
    } catch (e) {
      x = cartesianPosition[0];
    }

    try {
      let readValue = eval(_domElements.yField.value);
      y = parseFloat(readValue);
    } catch (e) {
      y = cartesianPosition[1];
    }

    return [x, y];
  };

  var updateEditorPosition = () => {
    let position = _selectedJoint.position;
    let absolutePosition = _engine.translateToAbsolutePosition(position);

    let width = _domElements.editor.clientWidth;
    let height = _domElements.editor.clientHeight;

    if (absolutePosition[0] < _engine.width / 2) {
      _domElements.editor.style.left = (absolutePosition[0] + 50) + "px";
    } else {
      _domElements.editor.style.left = (absolutePosition[0] - width - 50) + "px";
    }

    if (absolutePosition[1] < _engine.height / 4) {
      _domElements.editor.style.top = (absolutePosition[1]) + "px";
    } else if (absolutePosition[1] > _engine.height * 3 / 4) {
      _domElements.editor.style.top = (absolutePosition[1] - height) + "px";
    } else {
      _domElements.editor.style.top = (absolutePosition[1] - height / 2) + "px";
    }
  };

  var updateEditorButtonText = () => {
    if (_selectedJoint.positionLock.x) {
      _domElements.lockXButton.innerHTML = "Unlock X";
    } else {
      _domElements.lockXButton.innerHTML = "Lock X";
    }

    if (_selectedJoint.positionLock.y) {
      _domElements.lockYButton.innerHTML = "Unlock Y";
    } else {
      _domElements.lockYButton.innerHTML = "Lock Y";
    }

    if (_selectedJoint.mirrorJoint) {
      _domElements.mirrorButton.innerHTML = "Unmirror";
    } else {
      _domElements.mirrorButton.innerHTML = "Mirror";
    }

    if (_selectedJoint.showPosition) {
      _domElements.showPosButton.innerHTML = "Hide Position";
    } else {
      _domElements.showPosButton.innerHTML = "Show Position";
    }
  };

  editor.updateButton = () => {
    var cartesianPosition = readPositionFields();
    var position = _engine.translateFromCartesianPosition(cartesianPosition);

    _selectedJoint.updatePosition(_engine.clipPosition(position), {ignoreLock: true});
    _selectedJoint.applyForce = readForceField();

    updateEditorPosition();
    _engine.requestUpdate();
  };

  editor.mirrorButton = () => {
    if (_selectedJoint.mirrorJoint) {
      _selectedJoint.mirrorJoint.mirrorJoint = null;
      _selectedJoint.mirrorJoint = null;
      updateEditorButtonText();
    } else {
      let testPosition = _selectedJoint.getMirroredPosition();
      _selectedJoint.mirrorJoint = _engine.jointAtPosition(testPosition);
      if (_selectedJoint.mirrorJoint) {
        _selectedJoint.mirrorJoint.mirrorJoint = _selectedJoint;
        updateEditorButtonText();
      }
    }
  }

  editor.lockButton = (axis) => {
    _selectedJoint.positionLock[axis] = !_selectedJoint.positionLock[axis];
    updateEditorButtonText();
  }

  editor.closeButton = () => {
    editor.disable();
  };

  editor.jointTypeButton = (type) => {
    _selectedJoint.jointType = type;
    _engine.requestUpdate();
  }

  editor.removeButton = () => {
    _model.removeJoint(_selectedJoint);
    _selectedJoint = null;

    editor.disable();
    _engine.requestUpdate();
  }

  editor.showPositionButton = () => {
    _selectedJoint.showPosition = !_selectedJoint.showPosition;
    updateEditorButtonText();
    _engine.requestUpdate();
  }

  editor.optimizeButton = () => {
    let parameters = window.prompt("X Range, Y Range, Step", _lastParameters);
    parameters = parameters.split(",").map(parseFloat);
    if (parameters.length == 3) {
      _lastParameters = parameters;
      let joint = _selectedJoint;
      editor.disable();
      _model.optimizeJoint(joint, parameters[0], parameters[1], parameters[2]);
      window.alert("Optimized");
    } else {
      window.alert("Invalid parameters");
    }
  }

  return editor;
})();
