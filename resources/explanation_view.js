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
renderer.setSize( window.innerWidth  , window.innerHeight  );
renderer.setClearColor( 0x00000, 0 );
//renderer.sortObjects = false;
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
var wireframeBH;
var radialPlane;
var nonCurvedPath;
var curvedPathLeft; 
var curvedPathRight; 
var captionRadialPlane; 
var captionWireFrame;
var horizon; 

var paths = [nonCurvedPath, curvedPathLeft, curvedPathRight];
var allPathsDefined; //when all paths are defined, they can be clicked (allPathsDefined == true -> on click event listener works)
var particle;
var segments = [];
var segmentGeo = new THREE.BoxGeometry( 1, 1, 0 );
var segmentSlider; 

var particleMaterial = new THREE.SpriteMaterial( {
    color: 0xffffff
    
} );

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

var segmentMat = new THREE.LineBasicMaterial( {
    color: 0xD3D3D3,
    transparent: false,
    opacity: 1, 
    polygonOffset: false,
    linewidth: 3
} );

var mouse = new THREE.Vector2();



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



var drawSegment = function(position){
    var segment = new THREE.Mesh( segmentGeo, new THREE.MeshBasicMaterial( { color: 0xffffff } ) );
    segment.position.copy(position);
    segment.scale.x = 0.5;
    segment.scale.y = 0.2;
    return segment;
    
}



var animateFlatPath = function(segmentIndex, totalLength, totalNumberOfSegments){
    if (segmentIndex < totalNumberOfSegments){
        setTimeout(function(){
            var lineGeometry = new THREE.Geometry();
            var beginPoint = -totalLength/2;
            var endPoint = beginPoint + totalLength/totalNumberOfSegments * segmentIndex;
            /*lineGeometry.vertices.push(
                new THREE.Vector3( beginPoint, 0, 0 ),
                new THREE.Vector3( endPoint, 0, 0 ));
            nonCurvedPath = new THREE.Line( lineGeometry, pathMat );
            paths[0] = nonCurvedPath;
            scene.add(nonCurvedPath);*/
            segmentIndex++;

            var segmentFlat = drawSegment(new THREE.Vector3( endPoint, 0, 0 ));
            segments.push(segmentFlat);
            scene.add(segments[segmentIndex-1]);
            

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

var generateStarPath = function(symmetricPart, material){

    /*var geometry = new THREE.Geometry();
    var maxIndex = 5 * data.radius;
    for (i = 0; i < maxIndex ; i++) { 
        geometry.vertices.push( starPath(i/maxIndex, symmetricPart)); 
    }

    return new THREE.Line( geometry, material );*/

    console.log("generateStarPath");

    var maxIndex = 5 * data.radius;
    for (i = 0; i < maxIndex ; i++) { 
        var segmentCurved = drawSegment(starPath(i/maxIndex, symmetricPart));
        segmentCurved.position.y -= data.meshOffset;
        //segmentCurved.scale.x = 5;
        if (symmetricPart) //right part of the path: climbing
            segmentCurved.rotation.x = -3.14 / 4;
        else //left part of the path: ascending
            segmentCurved.rotation.x = +3.14 / 4;
        scene.add(segmentCurved);
    }

    
}


var initWireframe = function(){

    //create the geometry wireframe
    SS = new THREE.ParametricGeometry( staticStar, data.slices, data.stacks );
    var edgesGeo = new THREE.EdgesGeometry(SS, 0.01);
    wireframe = new THREE.LineSegments( edgesGeo, lineMat );

    wireframe.position.y = -data.meshOffset;
    scene.add( wireframe );

    generateStarPath(true, pathMat); 
    generateStarPath(false, pathMat);

    // create the paths 
    /*curvedPathLeft = generateStarPath(true, pathMat); 
    curvedPathRight = generateStarPath(false, pathMat);

    curvedPathLeft.position.y = -data.meshOffset;
    curvedPathRight.position.y = -data.meshOffset;

    paths[1] = curvedPathLeft ;
    paths[2] = curvedPathRight ;*/

    allPathsDefined = true; 

    
    //scene.add( curvedPathLeft );
    //scene.add( curvedPathRight );
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
    }

    var folder = gui.addFolder( 'Controls' );

    folder.add(data, 'density', 0, maxDensity).step(0.0001).onChange(updateGeometryDensity);

    updateGeometryDensity();

};



function onDocumentMouseMove( event ) {

    if (allPathsDefined){
        event.preventDefault();
        mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
        var raycaster = new THREE.Raycaster();
        raycaster.setFromCamera( mouse, camera );
        var intersects = raycaster.intersectObjects( segments );
        var vector = new THREE.Vector3();
        vector.set(
            mouse.x,
            mouse.y,
            0 );
        vector.unproject( camera );
        if ( intersects.length > 0 ) {
            //intersects[ 0 ].object.material.color.setHex( 0x000000 );
            scene.remove(segmentSlider);
            segmentSlider = new THREE.Mesh( segmentGeo, new THREE.MeshBasicMaterial( { color: 0x000000 } ) );
            segmentSlider.position.copy(intersects[ 0 ].point);
            segmentSlider.position.z = 0.001;
            segmentSlider.scale.x = 5;
            segmentSlider.scale.y = 1;
            scene.add(segmentSlider);

        }
    }
}



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
            opac += 0.01; 
            animateHorizon(opac);
        }, 30);

    }

}

var initWireframeBH = function(){

    //create the geometry wireframe of the black hole
    BH = new THREE.ParametricGeometry( blackHole, data.slices, data.stacks );
    var edgesGeo = new THREE.EdgesGeometry(BH, 0.01);
    wireframeBH = new THREE.LineSegments( edgesGeo, lineMat );
    wireframeBH.position.y = -data.meshOffset - Math.sqrt(25 * 8 * 2.5);
    scene.add( wireframeBH );

}




var narrative = function(narrationPhase){

    if (narrationPhase == "flatPath"){
       // document.getElementById('narration').innerHTML = "This is a path through the flat space.";
       initFlatGeometry();
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
    else if (narrationPhase == "compareDistances"){
        fadeOut(radialPlane);
        fadeOut(SPmesh);
        fadeOut(wireframe);
        compareLengthInteraction();

    }
    else if (narrationPhase == "collapse"){
        collapseSphere();
        fadeOut(wireframe);
        fadeOut(curvedPathRight);
        fadeOut(curvedPathLeft);
        animateHorizon(0);
        fadeOut(wireframe);
        initWireframeBH();
    }
    else if (narrationPhase == "fadeOut"){
       // document.getElementById('narration').innerHTML = "";
       fadeOut(radialPlane);

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
    camera.lookAt( scene.position );
    renderer.render( scene, camera );

};


document.addEventListener( 'mousemove', onDocumentMouseMove, false );


window.addEventListener( 'resize', function () {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}, false );


initLights();

