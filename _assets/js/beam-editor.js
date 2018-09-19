let beamEditor = (function() {
  let editor = {};

  let _enabled = false;
  let _domElements = {};
  let _selectedBeam = null;
  let _engine = null;
  let _model = null;

  editor.setup = (engine, model) => {
    _domElements.editor = document.getElementById('beam-editor');
    _domElements.forceField = document.getElementById('beam-editor-f');

    _engine = engine;
    _model = model;
  };

  editor.enableForBeam = (beam) => {
    if (beam == _selectedBeam) {
      return;
    } else if (_enabled) {
      _selectedBeam.selected = false;
    }

    _selectedBeam = beam;
    _selectedBeam.selected = true;
    _engine.requestUpdate();

    let position = _selectedBeam.center;
    setForceField(_selectedBeam.distributedForce);

    _enabled = true;
    _domElements.editor.style.display = "block";
    updateEditorPosition();
  };

  editor.disable = () => {
    if (!_enabled) {
      return;
    }

    if (_selectedBeam) {
      _selectedBeam.selected = false;
      _selectedBeam = null;
      _engine.requestUpdate();
    }

    _enabled = false;
    _domElements.editor.style.display = "none";
  };

  var setForceField = (force) => {
    _domElements.forceField.value = +force.toFixed(3);
  };

  var readForceField = () => {
    return parseFloat(_domElements.forceField.value);
  };

  var updateEditorPosition = () => {
    let position = _selectedBeam.center();
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

  editor.updateButton = () => {
    _selectedBeam.updateDistributedForce(readForceField(),
      _model.distributedForceUnit);
    _engine.requestUpdate();
  };

  editor.closeButton = () => {
    editor.disable();
  };

  editor.removeButton = () => {
    _model.removeBeam(_selectedBeam);
    _selectedBeam = null;

    editor.disable();
    _engine.requestUpdate();
  };

  return editor;
})();
