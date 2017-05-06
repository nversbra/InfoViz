var gui = new dat.GUI();
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 3000);

// initial camera position 
camera.position.z = 5 * Math.sin(3* Math.PI / 4);
camera.position.x = 5 * Math.cos(3* Math.PI / 4);
camera.position.y =  3;
camera.lookAt(0, 0, 0);

var camStepsIndex = false; 
var totalNumberOfCamSteps = 0;
var camMoveDirection = new THREE.Vector3(0,0,0);

var renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth * 0.9 , window.innerHeight * 0.9 );
renderer.setClearColor( 0x00000, 0 );
document.body.appendChild( renderer.domElement );

var orbit = new THREE.OrbitControls( camera, renderer.domElement );
orbit.enabled = true; 

var textLabels = []; 

var maxDensity = 0.004; 

var data = {
    slices : 50,
    stacks : 50,
    width : 50,
    height : 50,
    phiStart : 0,
    phiLength : 6.3,
    thetaStart : 6,
    thetaLength : 6.3, 
    sphereRadius : 5,
    radius : 5,
    offsetY : 0,
    meshOffset : 5,
    maxRadiusFactor : 5,
    density : 0.001
};




// 
var forward = function(){
    narrationIndex += 1;
    narrationPhase = narrationPhases[narrationIndex];
    needsUpdate = true;
}


var SPmesh = new THREE.Object3D();
var SSmesh = new THREE.Object3D();
var wireframe; 
var radialPlane;
var nonCurvedPath;
var curvedPathLeft; 
var curvedPathRight; 
var captionRadialPlane; 
var captionWireFrame;
var horizon; 

var lineMat = new THREE.LineBasicMaterial( {
    color: 0xffffff,
    transparent: false,
    opacity: 0.5, 
    polygonOffset: false
} );

var pathMat = new THREE.LineBasicMaterial( {
    color: 0xffffff,
    transparent: false,
    opacity: 0.5, 
    polygonOffset: false,
    linewidth: 3
} );





var createLabel = function(parentThreeJSObject){
    var div = document.createElement('div');
    div.className = 'text-label';
    div.style.position = 'absolute';
    div.style.width = 100;
    div.style.height = 100;
    // this is updated once the scene is rendered 
    div.innerHTML = "";
    div.style.top = -1000;
    div.style.left = -1000;

    var _this = this;
    
    return {
      element: div,
      parent: parentThreeJSObject,
      position: new THREE.Vector3(0,0,0),
      setHTML: function(html) {
        this.element.innerHTML = html;
    },
          /*setParent: function(threejsobj) {
            this.parent = threejsobj;
        },*/
        updatePosition: function() {
            if(parent) {
                this.position.copy(this.parent.position);
                this.position.x += data.maxRadiusFactor * data.radius;
            }
            var coords2d = this.get2DCoords();
            this.element.style.left = (coords2d.x + 20) + 'px';
            this.element.style.top = (coords2d.y + 50) + 'px';
        },
        get2DCoords: function() {
            var vector = this.position.project(camera);
            vector.x = (vector.x + 1)/2 * window.innerWidth;
            vector.y = -(vector.y - 1)/2 * window.innerHeight;
            return vector;
        }
    };
}

var type = function(textLabel, text, textIndex) {
    textLabel.element.innerHTML = text.substr(0, textIndex++);
    if(textIndex < text.length+1) {
        setTimeout(function(){
            type(textLabel, text, textIndex++);
        }, 60);
    }
    //return true; 
}

var initFlatGeometry = function(){

    var planeMaterial = new THREE.MeshPhongMaterial( {color: 0xD3D3D3, side: THREE.DoubleSide, map: THREE.ImageUtils.loadTexture('../images/starry_sky.png')} );
    var RF = new THREE.CircleGeometry( data.maxRadiusFactor * data.radius, 100 );
    radialPlane = new THREE.Mesh( RF, planeMaterial );
    radialPlane.position.y = data.offsetY;
    radialPlane.rotation.x = Math.PI / 2; //+ Math.PI / 10 ;
    //radialPlane.position.x = data.meshOffset;

    scene.add(radialPlane);    
}

/*var initFlatPath = function(){
    // create the flat path 
    var lineGeometry = new THREE.Geometry();
    lineGeometry.vertices.push(
        new THREE.Vector3( -data.maxRadiusFactor*data.radius, 0, 0 ),
        new THREE.Vector3( data.maxRadiusFactor*data.radius, 0, 0 )
    );
    nonCurvedPath = new THREE.Line( lineGeometry, pathMat );
    //nonCurvedPath.position.x = data.meshOffset;
    scene.add(nonCurvedPath);
}*/

var animateFlatPath = function(segmentIndex, totalLength, totalNumberOfSegments){
    if (segmentIndex < totalNumberOfSegments){
        setTimeout(function(){
            var lineGeometry = new THREE.Geometry();
            var beginPoint = -totalLength/2;
            var endPoint = beginPoint + totalLength/totalNumberOfSegments * segmentIndex;
            lineGeometry.vertices.push(
                new THREE.Vector3( beginPoint, 0, 0 ),
                new THREE.Vector3( endPoint, 0, 0 ));
            nonCurvedPath = new THREE.Line( lineGeometry, pathMat );
            scene.add(nonCurvedPath);
            segmentIndex++;
            animateFlatPath(segmentIndex, totalLength, totalNumberOfSegments);
        }, 30);
    };
}

var moveCamera = function(){
    if (camStepsIndex < totalNumberOfCamSteps){
        var increment =  camMoveDirection.clone().divideScalar(totalNumberOfCamSteps);
        camera.position.add(increment);
        camera.lookAt(0, 0, 0);
        camStepsIndex++;
    };
}

var fadeOut = function(ThreeJSObject){
    if (ThreeJSObject.material.opacity > 0){
        setTimeout(function(){
            ThreeJSObject.material.opacity -= 0.10; 
            fadeOut(ThreeJSObject);
        }, 30);
    }
    else{
        scene.remove(ThreeJSObject);
    }
}


var initSphere = function(withTexture){

    //create the sphere 
    SP = new THREE.SphereGeometry(data.sphereRadius, data.slices, data.stacks, data.phiStart, data.phiLength, data.thetaStart, data.thetaLength);
    var SPMaterial;
    if (withTexture){
        SPmaterial = new THREE.MeshPhongMaterial( { color: 0xffffff, wireframe: false, transparent : true, opacity: 0, map: THREE.ImageUtils.loadTexture('../images/star-surface.jpg')});
    }
    else{
        SPmaterial = new THREE.MeshPhongMaterial( { color: 0xffffff, wireframe: false, transparent : true, opacity: 0});   
    }

    SPmesh = new THREE.Mesh( SP, SPmaterial );
    var opacity = data.density / maxDensity + 0.6;
    SPmesh.material.opacity =  opacity ;
    scene.add(SPmesh);     
}


var initWireframe = function(){

    //create the geometry wireframe
    SS = new THREE.ParametricGeometry( staticStar, data.slices, data.stacks );
    var edgesGeo = new THREE.EdgesGeometry(SS, 0.01);
    wireframe = new THREE.LineSegments( edgesGeo, lineMat );

    wireframe.position.y = -data.meshOffset;

    // create the paths 
    curvedPathLeft = generateStarPath(true, pathMat); 
    curvedPathRight = generateStarPath(false, pathMat);

    curvedPathLeft.position.y = -data.meshOffset;
    curvedPathRight.position.y = -data.meshOffset;

    scene.add( wireframe );
    scene.add( curvedPathLeft );
    scene.add( curvedPathRight );
}


var initLabelsStarPhase = function(){
    captionRadialPlane = createLabel(radialPlane);
    this.ThreeJS.appendChild(captionRadialPlane.element);
    textLabels.push(captionRadialPlane);

    captionWireFrame = createLabel(wireframe);
    this.ThreeJS.appendChild(captionWireFrame.element);
    textLabels.push(captionWireFrame);
}


var interaction =  function() {

    function updateGeometryDensity() {
        scene.remove(wireframe);
        scene.remove(curvedPathLeft);
        scene.remove(curvedPathRight);
        var opacity = data.density / maxDensity + 0.6;
        SPmesh.material.opacity =  opacity ;

        initWireframe();

        

    //removeMesh(); // adds the meshes that are set to true from the beginning   (otherwise, they are only rendered once the controls are changed)
}

var folder = gui.addFolder( 'Controls' );

    folder.add(data, 'density', 0, maxDensity).step(0.0001).onChange(updateGeometryDensity);

    updateGeometryDensity();

};

var collapseSphere = function (){

    if (data.sphereRadius > 1){
        setTimeout(function(){
            scene.remove(SPmesh);
            data.sphereRadius -= 0.1; 
            initSphere(false);
            collapseSphere();
        }, 30);
    }
}

var initHorizon = function(opac){
    var H = new THREE.SphereGeometry(data.radius, data.slices, data.stacks, data.phiStart, data.phiLength, data.thetaStart, data.thetaLength);
    var SPMaterial;
    SPmaterial = new THREE.MeshBasicMaterial( { color: 0x000000 , opacity : opac, transparent:true});
    horizon = new THREE.Mesh( H, SPmaterial );
    scene.add(horizon);  
}

var animateHorizon = function (opac){
    if (opac < 1){
        setTimeout(function(){
            scene.remove(horizon);
            initHorizon(opac);
            opac += 0.1; 
            animateHorizon(opac);
        }, 60);

    }

}

/*var compareLengthInteraction = function(){
    var vector = new THREE.Vector3();
    vector.set(
        ( event.clientX / window.innerWidth ) * 2 - 1,
        - ( event.clientY / window.innerHeight ) * 2 + 1,
        0.5 );

    vector.unproject( camera );

    var dir = vector.sub( camera.position ).normalize();

    var distance = - camera.position.z / dir.z;

    var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );

    console.log(pos);

}*/


var narrative = function(narrationPhase){

    if (narrationPhase == "initEView"){
    }
    else if (narrationPhase == "2D"){
        //document.getElementById('narration').innerHTML = "Suppose we have a flat, two-dimensional space. <br> The space is flat because there is no mass.";
        initFlatGeometry();

    }
    else if (narrationPhase == "flatPath"){
       // document.getElementById('narration').innerHTML = "This is a path through the flat space.";
        animateFlatPath(0, 2*data.maxRadiusFactor*data.radius, 100);
        var finalCameraPosition = new THREE.Vector3(0,4,50);
        camMoveDirection = new THREE.Vector3(finalCameraPosition.x - camera.position.x, finalCameraPosition.y - camera.position.y, finalCameraPosition.z - camera.position.z);
        totalNumberOfCamSteps = 400;
        camStepsIndex=0;
    }   
    else if (narrationPhase == "addStar"){
       // document.getElementById('narration').innerHTML = "Now we add a heavy object, such as a star. <br> The presence of the mass curves the 2D space.";
        initSphere(false);
        initWireframe();
        initLabelsStarPhase();
        type(captionRadialPlane, "This is what you see.", 0);
        type(captionWireFrame, "This is the underlying structure of space.", 0);
        var finalCameraPosition = new THREE.Vector3(5,2,60);
        camMoveDirection = new THREE.Vector3(finalCameraPosition.x - camera.position.x, finalCameraPosition.y - camera.position.y, finalCameraPosition.z - camera.position.z);
        totalNumberOfCamSteps = 100;
        camStepsIndex=0;

    }
    else if (narrationPhase == "massInteraction"){
        //document.getElementById('narration').innerHTML = "You can change the mass of the star to see the effect on the curvature of the 2D space";
        interaction();
    }
    else if (narrationPhase == "collapse"){
        collapseSphere();
        fadeOut(wireframe);
        fadeOut(curvedPathRight);
        fadeOut(curvedPathLeft);
        animateHorizon(0);
    }
    else if (narrationPhase == "fadeOut"){
       // document.getElementById('narration').innerHTML = "";
        fadeOut(radialPlane);
        fadeOut(wireframe);
        fadeOut(SPmesh);

    }
    else if( narrationPhase == "compareLength"){
        compareLengthInteraction();
    }

}

var render = function (narrationPhase) {

    narrative(narrationPhase);
    requestAnimationFrame( render );

    for(var i=0; i<textLabels.length; i++) {
      textLabels[i].updatePosition();
  }

    moveCamera(); // moves the camera to a different position along a straight line whenever the parameters "camMoveDirection" etc. are set correcly. 
    renderer.render( scene, camera );

};


window.addEventListener( 'resize', function () {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}, false );


initLights();

