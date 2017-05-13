var gui;
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
renderer.setSize( window.innerWidth   , window.innerHeight  );
renderer.setClearColor( 0x00000, 0 );
document.body.appendChild( renderer.domElement );

var orbit = new THREE.OrbitControls( camera, renderer.domElement );
orbit.enabled = true; 

var textLabels = []; 

var maxMass = 1.5; 
var Rs = 2 * maxMass; // Schwarschild radius (stars with radius < Rs are black holes)


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
    mass: 0.2,
    offsetY : 2,
    meshOffset : 1,
    maxRadiusFactor : 5,
    segmentWidth : 1, 
    segmentHeight : 0.15, 
    lightStar : true,
    lightMass : 0.2, 
    heavyStar : false, 
    heavyMass : 0.8,
    superHeavyStar : false, 
    superHeavyMass : maxMass,
    starMass : 1 //categorical variable
};


var SPmesh = new THREE.Object3D();
var SSmesh = new THREE.Object3D();
var wireframeLight;
var wireframeHeavy; 
var wireframeSuperHeavy 
var wireframeBH;
var radialPlane;
/*var nonCurvedPath;
var curvedPathLeft; 
var curvedPathRight; */
var captionRadialPlane; 
var captionWireFrame;
var horizon; 

//var paths = [nonCurvedPath, curvedPathLeft, curvedPathRight];
var allPathsDefined; //when all paths are defined, they can be clicked (allPathsDefined == true -> on click event listener works)

var segmentGeo = new THREE.BoxGeometry( 1, 1, 0 );
var segmentsFlat = [];
var segmentsLight = [];
var segmentsHeavy = [];
var segmentsSuperHeavy = [];
var segmentSlider; 
var mouse = new THREE.Vector2();

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



/****************************
**** general functions ******
****************************/

var forward = function(){
    narrationIndex += 1;
    narrationPhase = narrationPhases[narrationIndex];
    needsUpdate = true;
}


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

var drawSegment = function(position, scalingX){
    var segment = new THREE.Mesh( segmentGeo, new THREE.MeshBasicMaterial( { color: 0xffffff } ) );
    segment.position.copy(position);
    segment.scale.x = data.segmentWidth * scalingX;
    segment.scale.y = data.segmentHeight;
    return segment; 
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





/****************************
**** narrative functions ******
****************************/



var initFlatGeometry = function(){

    var planeMaterial = new THREE.MeshPhongMaterial( {color: 0x000000, side: THREE.DoubleSide} );
    var RF = new THREE.CircleGeometry( data.maxRadiusFactor * data.radius, 100 );
    radialPlane = new THREE.Mesh( RF, planeMaterial );
    radialPlane.position.y = data.offsetY;
    radialPlane.rotation.x = Math.PI / 2; //+ Math.PI / 10 ;
    //radialPlane.position.x = data.meshOffset;

    scene.add(radialPlane);    
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

            var segmentFlat = drawSegment(new THREE.Vector3( endPoint, data.offsetY, 0 ), 1);
            segmentsFlat.push(segmentFlat);
            scene.add(segmentsFlat[segmentIndex-1]);
            animateFlatPath(segmentIndex, totalLength, totalNumberOfSegments);
        }, 30);
    };
}


var initSphere = function(withTexture){

    //create the sphere 
    SP = new THREE.SphereGeometry(data.sphereRadius, data.slices, data.stacks, data.phiStart, data.phiLength, data.thetaStart, data.thetaLength);
    var SPMaterial;
    if (withTexture){
        SPmaterial = new THREE.MeshPhongMaterial( { color: 0xffffff, wireframe: false, transparent : false, opacity: 0.2, map: THREE.ImageUtils.loadTexture('../images/star-surface.jpg')});
    }
    else{
        SPmaterial = new THREE.MeshPhongMaterial( { color: 0xffffff, wireframe: false, transparent : true, opacity: 0});   
    }

    SPmesh = new THREE.Mesh( SP, SPmaterial );
    var opacity = data.mass / maxMass + 0.6;
    SPmesh.material.opacity =  opacity ;
    SPmesh.position.y = data.offsetY;
    scene.add(SPmesh);     
}

var generateStarPath = function(symmetricPart, material, segmentsArray){


    var maxIndex = 5 * data.radius;
    for (i = 0; i < maxIndex  ; i++) { 
        var j = i; 
        if (symmetricPart)
             j = maxIndex - i; 

        var currentI = j/maxIndex;
        var currentR = j;
        var metricScaling; 
        if (Math.abs(currentR)  >  Math.abs(data.sphereRadius)){
            metricScaling = 1 / Math.sqrt( (1 - (2 * data.mass / currentR)) );
        }
        else if (currentR ==0){
            metricScaling = 1;
        }
        else {
            var insideMass =  data.mass * Math.pow(currentR/data.sphereRadius,3);
            metricScaling = 1 / Math.sqrt( (1 - (2 * insideMass / currentR)) );
        }
        var segmentCurved = drawSegment(starPath(currentI, symmetricPart), metricScaling);
        segmentCurved.position.y -= data.meshOffset;

        if (symmetricPart) //right part of the path: climbing
            segmentCurved.rotation.z = +Math.asin(1/metricScaling) + 1.5 * Math.PI ;
        else //left part of the path: ascending
            segmentCurved.rotation.z = -Math.asin(1/metricScaling) - 1.5 * Math.PI ;

        segmentsArray.push(segmentCurved);

        var actualIndex;

        if(!symmetricPart)
            actualIndex = i +  maxIndex; 
        else 
            actualIndex = i;
        
        scene.add(segmentsArray[actualIndex]);
    }


}


var initWireframe = function(wireframe){

    //create the geometry wireframe
    var SS = new THREE.ParametricGeometry( staticStar, data.slices, data.stacks );
    var edgesGeo = new THREE.EdgesGeometry(SS, 0.01);

    if (wireframe == "light"){
        wireframeLight = new THREE.LineSegments( edgesGeo, lineMat );
        wireframeLight.position.y = -data.meshOffset;   
        scene.add( wireframeLight );
    }

    if (wireframe == "heavy"){
        wireframeHeavy = new THREE.LineSegments( edgesGeo, lineMat );
        wireframeHeavy.position.y = -data.meshOffset;   
        scene.add( wireframeHeavy );
    }

    if (wireframe == "superHeavy"){
        wireframeSuperHeavy = new THREE.LineSegments( edgesGeo, lineMat );
        wireframeSuperHeavy.position.y = -data.meshOffset;   
        scene.add( wireframeSuperHeavy );
    }


}

var createCurvedPaths = function(segmentsArray) {

    generateStarPath(true, pathMat, segmentsArray); // left path
    generateStarPath(false, pathMat, segmentsArray); // right path

    allPathsDefined = true; 

}

var removeCurvedPaths = function(segmentsArray){
    for (i = 0; i < segmentsArray.length; i++){
        scene.remove(segmentsArray[i]);
    }
    segmentsArray = [];
}




var initLabelsStarPhase = function(){
    captionRadialPlane = createLabel(radialPlane);
    this.ThreeJS.appendChild(captionRadialPlane.element);
    textLabels.push(captionRadialPlane);

    captionWireFrame = createLabel(wireframe);
    this.ThreeJS.appendChild(captionWireFrame.element);
    textLabels.push(captionWireFrame);
}


var massInteraction =  function(narrationPhase) {

    function updatePaths() {
        scene.remove(wireframeHeavy);
        scene.remove(wireframeLight);
        scene.remove(wireframeSuperHeavy);

        if (data.lightStar){
            data.mass = data.lightMass;
            createCurvedPaths(segmentsLight);
        }
        else{
            removeCurvedPaths(segmentsLight);
        }
            

        if (data.heavyStar){
            data.mass = data.heavyMass;
            createCurvedPaths(segmentsHeavy);
        }
        else{
            removeCurvedPaths(segmentsHeavy);
        }
            

        if (data.superHeavyStar){
            data.mass = data.superHeavyMass;
            createCurvedPaths(segmentsSuperHeavy);
        }
        else{
            removeCurvedPaths(segmentsSuperHeavy);
        }
            

        /*var opacity = data.mass / maxMass + 0.2;
        SPmesh.material.opacity =  opacity ; */
        
    }

    function updatePathsAndWireframes(){


        if (data.starMass == 1){
            data.lightStar = true;  
            data.heavyStar = false;  
            data.superHeavyStar = false;  
        } 
        else if (data.starMass == 2){
            data.lightStar = false;  
            data.heavyStar = true; 
            data.superHeavyStar = false;  
        }   
        else if (data.starMass == 3){
            data.lightStar = false;  
            data.heavyStar = false;  
            data.superHeavyStar = true;    
        }


        updatePaths();

        scene.remove(wireframeHeavy);
        scene.remove(wireframeLight);
        scene.remove(wireframeSuperHeavy);
            

        if (data.lightStar){
            data.mass = data.lightMass;
            initWireframe("light"); 
        }

        if (data.heavyStar){
            data.mass = data.heavyMass;
            initWireframe("heavy"); 
        }


        if (data.superHeavyStar){
            data.mass = data.superHeavyMass;
            initWireframe("superHeavy"); 
        }



    }

    gui = new dat.GUI();
    var folder = gui.addFolder( 'Control Mass' );

    //folder.add(data, 'mass', 0, maxMass).step(0.5).onChange(updateGeometryMass);
    if (narrationPhase == "massInteraction"){
        folder.add(data, 'starMass', { Light: 1, Heavy: 2, Very_Heavy: 3 } ).listen().onChange(updatePathsAndWireframes);
        updatePathsAndWireframes();
    }
    else{
        folder.add(data, 'lightStar').listen().onChange(updatePaths);
        folder.add(data, 'heavyStar').listen().onChange(updatePaths);
        folder.add(data, 'superHeavyStar').listen().onChange(updatePaths);
        updatePaths();
    }
    folder.open();

    

};



function onDocumentMouseMove( event ) {

    if (allPathsDefined){
        event.preventDefault();
        mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
        var raycaster = new THREE.Raycaster();
        raycaster.setFromCamera( mouse, camera );
        var intersects = raycaster.intersectObjects( segmentsFlat );
        var vector = new THREE.Vector3();
        vector.set(
            mouse.x,
            mouse.y,
            0 );
        vector.unproject( camera );
        if ( intersects.length > 0 ) {
            intersects[ 0 ].object.material.color.setHex( 0x000000 );
            var index = segmentsFlat.indexOf(intersects[ 0 ].object);
            if (segmentsLight[index])
                segmentsLight[index].material.color.setHex( 0x000000 );
            if (segmentsHeavy[index])
                segmentsHeavy[index].material.color.setHex( 0x000000 );
            if (segmentsSuperHeavy[index])
                segmentsSuperHeavy[index].material.color.setHex( 0x000000 );

            //scene.remove(segmentSlider);
            /*segmentSlider = new THREE.Mesh( segmentGeo, new THREE.MeshBasicMaterial( { color: 0x000000 } ) );
            segmentSlider.position.copy(intersects[ 0 ].point);
            segmentSlider.position.z = 0.001;
            segmentSlider.scale.x = 5;
            segmentSlider.scale.y = 1;
            scene.add(segmentSlider);*/

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








/****************************
**** narrative & render ******
****************************/




var narrative = function(narrationPhase){

    if (narrationPhase == "flatPath"){
       // document.getElementById('narration').innerHTML = "This is a path through the flat space.";
       initFlatGeometry();
       animateFlatPath(0, 2*data.maxRadiusFactor*data.radius, 2 * 5 * data.radius );
       var finalCameraPosition = new THREE.Vector3(0,4,50);
       camMoveDirection = new THREE.Vector3(finalCameraPosition.x - camera.position.x, finalCameraPosition.y - camera.position.y, finalCameraPosition.z - camera.position.z);
       totalNumberOfCamSteps = 400;
       camStepsIndex=0;
   }   
   else if (narrationPhase == "addStar"){
       // document.getElementById('narration').innerHTML = "Now we add a heavy object, such as a star. <br> The presence of the mass curves the 2D space.";
       initSphere(true);
       initWireframe("light");
       createCurvedPaths(segmentsLight);
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
        massInteraction(narrationPhase);
    }
    else if (narrationPhase == "compareDistances"){
        fadeOut(radialPlane);
        fadeOut(SPmesh);
        gui.destroy();
        massInteraction(narrationPhase);
        compareLengthInteraction();

    }
    else if (narrationPhase == "collapse"){
        collapseSphere();
        fadeOut(wireframe);
        //fadeOut(curvedPathRight);
        //fadeOut(curvedPathLeft);
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





/****************************
**** event listeners ******
****************************/


document.addEventListener( 'mousemove', onDocumentMouseMove, false );


window.addEventListener( 'resize', function () {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}, false );


initLights();

