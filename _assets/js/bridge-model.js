let bridgeModel = (function() {
  let model = {};

  model.beams = [];
  model.joints = [];

  model.temporaryJoint = null;
  model.temporaryBeam = null;

  model.lengthUnit = "mm";
  model.pixelToLengthRatio = 2.4;
  model.forceUnit = "N";
  model.distributedForceUnit = "N/mm";

  model.totalCost = 0.0;
  model.evaluatedCost = 0.0;

  model.invalidCostError = false;

  model.addJoint = (joint) => {
    model.joints.push(joint);
  };

  model.removeJoint = (joint) => {
    if (joint.mirrorJoint) {
      joint.mirrorJoint.mirrorJoint = null;
    }

    model.beams = model.beams.filter((beam) => {
      return !beam.isConnectedToJoint(joint);
    });

    let jointIndex = model.joints.indexOf(joint);
    model.joints.splice(jointIndex, 1);
  };

  model.removeBeam = (beam) => {
    model.beams.splice(model.beams.indexOf(beam), 1);
  };

  model.mergeRedundantBeams = (jointA, jointB) => {
    let mergedBeam;

    for (let i = model.beams.length - 1; i >= 0; i--) {
      var beam = model.beams[i];
      var connectToA = beam.isConnectedToJoint(jointA);
      var connectToB = beam.isConnectedToJoint(jointB);

      if (connectToA && connectToB) {
        if (mergedBeam) {
          mergedBeam.quantity += beam.quantity;
          model.beams.splice(i, 1);
        } else {
          mergedBeam = beam;
        }
      }
    }
  };

  model.mergeJoint = (jointA, jointB) => {
    if (jointA == jointB) return;

    var redundantTestList = [];
    for (var i = model.beams.length - 1; i >= 0; i--) {
      var beam = model.beams[i];
      var connectToA = beam.isConnectedToJoint(jointA);
      var connectToB = beam.isConnectedToJoint(jointB);

      if (connectToA && connectToB) {
        model.beams.splice(i, 1);
      } else if (connectToB) {
        if (beam.jointA == jointB) {
          beam.jointA = jointA;
          redundantTestList.push(beam.jointB);
        } else {
          beam.jointB = jointA;
          redundantTestList.push(beam.jointA);
        }
      }
    }

    model.joints.splice(model.joints.indexOf(jointB), 1);

    for (let testJoint of redundantTestList) {
      model.mergeRedundantBeams(jointA, testJoint);
    }
  };

  let updateBeamLengths = (changedJoint) => {
    const updateAll = changedJoint == null;

    for (let beam of model.beams) {
      if (updateAll || beam.isConnectedToJoint(changedJoint)) {
        beam.updateLength(model.pixelToLengthRatio, model.lengthUnit);
      }
    }
  };

  let updateJointForces = () => {
    for (let joint of model.joints) {
      joint.force = joint.applyForce;
    }

    for (let beam of model.beams) {
      let force = beam.distributedForce * beam.physicalLength / 2;
      beam.jointA.force += force;
      beam.jointB.force += force;
    }
  };

  let updateBeamForces = () => {
    var columnCount = model.beams.length;
    var specialJointCount = 0;
    var specialJoints = [];

    for (let joint of model.joints) {
      if (joint.jointType == 'f') {
        specialJointCount += 2
      } else if (joint.jointType == 's') {
        specialJointCount += 1;
      }
      specialJoints.push(joint);
    }
    columnCount += specialJointCount;

    if (columnCount != model.joints.length * 2) {
      model.beams.forEach((beam) => {
        beam.invalidateTensionForce();
      });
      return;
    }

    var specialJointIndex = 0;
    var zeros = new Array(specialJointCount).fill(0.0);

    var matrix = [];
    var constantColumn = [];

    for (let joint of model.joints) {
      var xForce = [];
      var yForce = [];

      for (let beam of model.beams) {
        var directionVector = beam.directionVector(joint);
        xForce.push(directionVector[0]);
        yForce.push(directionVector[1]);
      }

      if (joint.jointType == 'f') {
        var xComponent = zeros.slice();
        var yComponent = zeros.slice();

        xComponent[specialJointIndex] = 1.0;
        yComponent[specialJointIndex + 1] = 1.0;
        specialJointIndex += 2;

        xForce = xForce.concat(xComponent);
        yForce = yForce.concat(yComponent);
      } else if (joint.jointType == 's') {
        var yComponent = zeros.slice();

        yComponent[specialJointIndex] = 1.0;
        specialJointIndex += 1;

        xForce = xForce.concat(zeros);
        yForce = yForce.concat(yComponent);
      } else {
        xForce = xForce.concat(zeros);
        yForce = yForce.concat(zeros);
      }

      matrix.push(xForce);
      matrix.push(yForce);

      constantColumn.push(0);
      constantColumn.push(-joint.force);
    }

    var tensionForces;
    try {
      tensionForces = numeric.dotMV(numeric.inv(matrix), constantColumn);
    } catch(e) {
      tensionForces = null;
    }

    if (!tensionForces) {
      model.invalidCostError = true;
      return;
    }

    model.beams.forEach((beam, index) => {
      beam.updateTensionForce(tensionForces[index], model.forceUnit);
    });

    var specialJointIndex = model.beams.length;
    specialJoints.forEach((joint) => {
      if (joint.jointType == 'f') {
        joint.supportForce = [
          -tensionForces[specialJointIndex],
          -tensionForces[specialJointIndex + 1]
        ];

        specialJointCount += 2
      } else if (joint.jointType == 's') {
        joint.supportForce = [
          0,
          -tensionForces[specialJointIndex]
        ];

        specialJointCount += 1;
      }
    });
  }

  let updateCost = () => {
    model.totalCost = 0.0;
    model.evaluatedCost = 0.0;

    for (let beam of model.beams) {
      model.totalCost += beam.physicalLength;

      if (beam.physicalLength < 1.0) {
        model.invalidCostError = true;
      }

      let cost = 0.02143;
      if (Math.abs(beam.tensionForce) < 0.0001) {
        cost = beam.physicalLength * 3.3 * 3.3 * 0.000123;
      } else if (beam.tensionForce > 0.0) {
        let width = beam.tensionForce / 7.7 / 3.3
        cost = beam.physicalLength * 3.3 * width * 0.000123;
      } else {
        let width = -beam.tensionForce / 7.4 / 3.3
        cost = beam.physicalLength * 3.3 * width * 0.000123;
      }

      model.evaluatedCost += cost;
    }

    model.evaluatedCost += model.joints.length * 0.04117;
  };

  model.update = () => {
    model.invalidCostError = false;

    updateBeamLengths();
    updateJointForces();
    updateBeamForces();
    updateCost();
  };

  let roundToStep = (value, step) => {
    step = Math.abs(step);
    value = Math.abs(value);
    return Math.floor(value / step) * step;
  }

  model.optimizeJoint = (joint, xRange, yRange, step) => {
    joint.engine.ignoreUpdateRequest = true;
    model.update();
    if (model.invalidCostError) {
      model.evaluatedCost *= 10000;
    }
    let minList = [[model.evaluatedCost, joint.position.slice()]];

    xRange = xRange * model.pixelToLengthRatio;
    yRange = yRange * model.pixelToLengthRatio;
    step = step * model.pixelToLengthRatio;

    let testXRange = [
      joint.position[0] - roundToStep(xRange, step),
      joint.position[0] + roundToStep(xRange, step)
    ];

    let testYRange = [
      joint.position[1] - roundToStep(yRange, step),
      joint.position[1] + roundToStep(yRange, step)
    ];

    let totalIterations = (roundToStep(xRange, step) / step) * 2;
    totalIterations *= (roundToStep(yRange, step) / step) * 2;

    let iterationCount = 0;
    let lastItUpdate = 0;

    for (let x = testXRange[0]; x <= testXRange[1]; x += step) {
      for (let y = testYRange[0]; y <= testYRange[1]; y+= step) {
        let position = [x, y];

        joint.updatePosition(position, {ignoreLock: true});
        model.update();
        if (!model.invalidCostError) {
          minList.push([
            model.evaluatedCost,
            position
          ]);
        }

        if (minList.length > 5) {
          minList.sort((a, b) => {
            if (a[0] == b[0]) {
              if (a[1] < b[1]) {
                return -1;
              } else if (a[1] > b[1]) {
                return 1;
              } else {
                return 0;
              }
            } else {
              if (a[0] < b[0]) {
                return -1;
              } else if (a[0] > b[0]) {
                return 1;
              } else {
                return 0;
              }
            }
          });
          minList.pop();
        }

        if (Math.floor(iterationCount / totalIterations * 10.0) >= lastItUpdate) {
          console.log(`Progress: ${lastItUpdate * 10}%`);
          lastItUpdate += 1;
        }
        iterationCount++;
      }
    }

    minList.sort();
    joint.updatePosition(minList[0][1]);
    joint.engine.ignoreUpdateRequest = false;
    joint.engine.requestUpdate();

    let output = "---optimizeJoint---\n";
    for (let min of minList) {
      let cartesian = joint.engine.translateToCartesianPosition(min[1]);
      output += `(${+cartesian[0].toFixed(4)}, ${+cartesian[1].toFixed(4)}) cost: ${min[0].toFixed(4)}\n`;
    }
    console.log(output);
  };

  return model;
})();
