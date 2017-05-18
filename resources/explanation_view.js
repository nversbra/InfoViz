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
    offsetY : 0,
    meshOffset : 3,
    maxRadiusFactor : 5,
    segmentWidth : 1, 
    segmentHeight : 0.15, 
    labelOffsetX : -10,
    labelOffsetY : -35,
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
var captionRadialPlane; 
var captionWireFrame;
var horizon; 

var allPathsDefined; //when all paths are defined, they can be clicked (allPathsDefined == true -> on click event listener works)

var segmentGeo = new THREE.BoxGeometry( 1, 1, 0 );
var segmentsFlat = [];
var segmentsLight = [];
var segmentsHeavy = [];
var segmentsSuperHeavy = [];
var segmentsBlackHole = [];
var prevSegments = []; // previously selected segments that should become white again if other segments are selected
var prevSegmentLabels = []; 
var mouse = new THREE.Vector2();

var lineMat = new THREE.LineBasicMaterial( {
    color: 0xffffff,
    transparent: true,
    opacity: 1, 
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

var listener = new THREE.AudioListener();
var sound = new THREE.Audio(listener);
var audioLoader = new THREE.AudioLoader();



/****************************
**** general functions ******
****************************/


var createLabel = function(parentThreeJSObject, offset_x, offset_y){
    var div = document.createElement('div');
    div.className = 'text-label';
    div.style.position = 'absolute';
    div.style.width = 100;
    div.style.height = 100;
    div.style.color = 'black'; 
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
                //this.position.x += data.maxRadiusFactor * data.radius;
            }
            var coords2d = this.get2DCoords();
            this.element.style.left = (coords2d.x + offset_x) + 'px';
            this.element.style.top = (coords2d.y + offset_y) + 'px';
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

var fadeIn = function(ThreeJSObject){
    if (ThreeJSObject.material.opacity < 1){
        setTimeout(function(){
            ThreeJSObject.material.opacity += 0.10; 
            fadeIn(ThreeJSObject);
        }, 30);
    }
    /*else{
        scene.add(ThreeJSObject);
    }*/
}

var playAudio = function(fileName){
    audioLoader.load(fileName, function (buffer) {
        sound.setBuffer(buffer);
        sound.setVolume(1.5);
        sound.play();        
    });

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
    scene.add(radialPlane);    
}


var animateFlatPath = function(segmentIndex, totalLength, totalNumberOfSegments){
    if (segmentIndex < totalNumberOfSegments){
        setTimeout(function(){
            var lineGeometry = new THREE.Geometry();
            var beginPoint = -totalLength/2;
            var endPoint = beginPoint + totalLength/totalNumberOfSegments * segmentIndex;
            segmentIndex++;
            var segmentFlat = drawSegment(new THREE.Vector3( endPoint, data.offsetY, 0 ), 1);
            segmentsFlat.push(segmentFlat);
            scene.add(segmentsFlat[segmentIndex-1]);
            animateFlatPath(segmentIndex, totalLength, totalNumberOfSegments);
        }, 60);
    };
}


var initSphere = function(withTexture){

    //create the sphere 
    SP = new THREE.SphereGeometry(data.sphereRadius, data.slices, data.stacks, data.phiStart, data.phiLength, data.thetaStart, data.thetaLength);
    var SPMaterial;
    if (withTexture){
        SPmaterial = new THREE.MeshPhongMaterial( { color: 0xffffff, wireframe: false, transparent : false, opacity: 0.2 });//, map: THREE.ImageUtils.loadTexture('../images/star-surface.jpg')});
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

var metricScalingStar = function(currentR){

    var metricScaling; 

    if (Math.abs(currentR)  >  Math.abs(data.radius)){
        metricScaling = 1 / Math.sqrt( (1 - (2 * data.mass / currentR)) );
    }
    else if (currentR ==0){
        metricScaling = 1;
    }
    else {
        var insideMass =  data.mass * Math.pow(currentR/data.radius,3);
        metricScaling = 1 / Math.sqrt( (1 - (2 * insideMass / currentR)) );
    }

    return metricScaling;

}

var generatePath = function(symmetricPart, type, segmentsArray){


    var maxIndex = 5 * data.radius;
    for (i = 0; i < maxIndex  ; i++) { 
        var j = i; 
        if (symmetricPart)
           j = maxIndex - i; 

       var currentI = j/maxIndex;
       var currentR = j;

       var metricScaling; 
       var segmentCurved;

       if (type == "star"){
        metricScaling = metricScalingStar(currentR);
        segmentCurved = drawSegment(starPath(currentI, symmetricPart), metricScaling);
    }

    else if (type == "blackHole"){
        metricScaling = metricScalingBH(currentR);
        segmentCurved = drawSegment(blackHole(currentI, 0), metricScaling);
        if (symmetricPart)
            segmentCurved.position.x = -segmentCurved.position.x;
    }
    if (metricScaling  == -1){
        segmentCurved.position.y = -Math.sqrt(25 * 8 * 2.5); 
        segmentCurved.rotation.z = Math.PI/2;
        segmentCurved.scale.x = 18;

    }
    else
    {
        segmentCurved.position.y -= data.meshOffset;
            if (symmetricPart) //right part of the path: climbing
                segmentCurved.rotation.z = +Math.asin(1/metricScaling) + 1.5 * Math.PI ;
            else //left part of the path: ascending
                segmentCurved.rotation.z = -Math.asin(1/metricScaling) - 1.5 * Math.PI ;

        }
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

    generatePath(true, "star", segmentsArray); // left path
    generatePath(false, "star", segmentsArray); // right path

    allPathsDefined = true; 

}

var removeCurvedPaths = function(segmentsArray){
    for (i = 0; i < segmentsArray.length; i++){
        scene.remove(segmentsArray[i]);
    }
    segmentsArray = [];
}




var initLabelsStarPhase = function(){
    captionRadialPlane = createLabel(radialPlane, 500, -5);
    this.ThreeJS.appendChild(captionRadialPlane.element);
    textLabels.push(captionRadialPlane);

    captionWireFrame = createLabel(wireframeLight, 500, -5);
    this.ThreeJS.appendChild(captionWireFrame.element);
    textLabels.push(captionWireFrame);
}

var removeLabelsStarPhase = function(){
    while (this.ThreeJS.hasChildNodes()) {
        this.ThreeJS.removeChild(this.ThreeJS.lastChild);
    }

}

function updatePaths() {

    /*if(wireframeLight )
        fadeOut(wireframeLight);
    if(wireframeHeavy )
        fadeOut(wireframeHeavy);
    if(wireframeSuperHeavy)
        fadeOut(wireframeSuperHeavy);*/
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


    var massInteraction =  function(narrationPhase) {


        gui = new dat.GUI();
        var folder = gui.addFolder( 'Control Mass' );

    //folder.add(data, 'mass', 0, maxMass).step(0.5).onChange(updateGeometryMass);
    if (narrationPhase == "massInteraction"){
        folder.add(data, 'starMass', { Light: 1, Heavy: 2, Very_Heavy: 3 } ).listen().onChange(updatePathsAndWireframes);
        //updatePathsAndWireframes();
    }
    else{
        folder.add(data, 'lightStar').listen().onChange(updatePaths);
        folder.add(data, 'heavyStar').listen().onChange(updatePaths);
        folder.add(data, 'superHeavyStar').listen().onChange(updatePaths);
        updatePaths();
    }
    folder.open();

    

};

var clearPaths = function(lightStarRemaining){
    data.heavyStar = false; 
    data.superHeavyStar = false;
    if (lightStarRemaining)
        data.lightStar = true; 
    else 
        data.lightStar = false; 
    updatePaths();

}

var clearSegmentsAndLabels = function(){
    var container = document.getElementById( 'ScaleLabels' );
    for (i = 0; i < prevSegments.length ; i++ ){
        prevSegments[i].material.color.setHex( 0xffffff );  // change the color of previously selected segments to white again
    }
    for (i = 0; i < prevSegmentLabels.length ; i++ ){
        if (prevSegmentLabels[i])
            container.removeChild(prevSegmentLabels[i].element);
    }

    prevSegmentLabels = [null, null, null, null, null];

}



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
            var container = document.getElementById( 'ScaleLabels' );

            clearSegmentsAndLabels();
            prevSegments = [];
            //intersects[ 0 ].object.material.color.setHex( 0x000000 ); //set the color of the flat path segment to black
            intersects[ 0 ].object.material.color.setRGB(255,0,0);
            prevSegments.push(intersects[ 0 ].object);

            // add the label 
            labelFlatSegment = createLabel(intersects[ 0 ].object, data.labelOffsetX + 5, data.labelOffsetY);
            labelFlatSegment.setHTML(intersects[ 0 ].object.scale.x);
            labelFlatSegment.updatePosition();
            //prevSegmentLabels.push(labelFlatSegment);
            prevSegmentLabels[0] = labelFlatSegment;
            container.appendChild(prevSegmentLabels[0].element);
            
            //set the color of the corresponding curved path segments to black, add the labels
            var index = segmentsFlat.indexOf(intersects[ 0 ].object);

            if (segmentsLight[index] && data.lightStar){
                var metricScaling = segmentsLight[index].scale.x.toPrecision(3);
                segmentsLight[index].material.color.setRGB(  1/(metricScaling),0, 1 - 1/(metricScaling));
                label = createLabel(segmentsLight[index], data.labelOffsetX, data.labelOffsetY);
                label.setHTML(metricScaling);
                label.updatePosition();
                prevSegmentLabels[1] = label;
                container.appendChild(prevSegmentLabels[1].element);
                prevSegments.push(segmentsLight[index]);
            }  
            if (segmentsHeavy[index] && data.heavyStar){
                var metricScaling = segmentsHeavy[index].scale.x.toPrecision(3);
                segmentsHeavy[index].material.color.setRGB(  1/(metricScaling),0,1- 1/(metricScaling));
                label = createLabel(segmentsHeavy[index], data.labelOffsetX, data.labelOffsetY);
                label.setHTML(metricScaling);
                label.updatePosition();
                prevSegmentLabels[2] = label;
                container.appendChild(prevSegmentLabels[2].element);
                prevSegments.push(segmentsHeavy[index]);
            }

            if (segmentsSuperHeavy[index] && data.superHeavyStar){
                var metricScaling = segmentsSuperHeavy[index].scale.x.toPrecision(3);
                segmentsSuperHeavy[index].material.color.setRGB(  1/(metricScaling),0,1 - 1/(metricScaling) );
                label = createLabel(segmentsSuperHeavy[index], data.labelOffsetX, data.labelOffsetY);
                label.setHTML(metricScaling);
                label.updatePosition();
                prevSegmentLabels[3] = label;
                container.appendChild(prevSegmentLabels[3].element);
                prevSegments.push(segmentsSuperHeavy[index]);
            }

            if (segmentsBlackHole[index]){
                label = createLabel(segmentsBlackHole[index], data.labelOffsetX, -data.labelOffsetY);
                var metricScaling =  segmentsBlackHole[index].scale.x.toPrecision(3);
                if (metricScaling > 10){
                    label = createLabel(segmentsBlackHole[index], data.labelOffsetX + 20 , -data.labelOffsetY - 140);
                    label.setHTML("&#8734");
                    segmentsBlackHole[index].material.color.setRGB( 0, 0, 1);
                }
                else{
                    label.setHTML(metricScaling);
                    segmentsBlackHole[index].material.color.setRGB( 1/(metricScaling) ,0,1 - 1/(metricScaling) );
                }

                label.updatePosition();
                prevSegmentLabels[4] = label;
                container.appendChild(prevSegmentLabels[4].element);
                prevSegments.push(segmentsBlackHole[index]);
            }
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
    horizon.position.y = data.offsetY;
    scene.add(horizon);  
}

var animateHorizon = function (opac){
    if (opac < 1){
        setTimeout(function(){
            scene.remove(horizon);
            initHorizon(opac);
            opac += 0.1; 
            animateHorizon(opac);
        }, 20);

    }

}

var initWireframeBH = function(){

    //create the geometry wireframe of the black hole
    BH = new THREE.ParametricGeometry( blackHole, data.slices, data.stacks );
    var edgesGeo = new THREE.EdgesGeometry(BH, 0.01);
    lineMat.opacity = 0;
    wireframeBH = new THREE.LineSegments( edgesGeo, lineMat );
    wireframeBH.position.y = -data.meshOffset; //- Math.sqrt(25 * 8 * 2.5);
    scene.add( wireframeBH );
    fadeIn(wireframeBH);
    //

}

var metricScalingBH = function(currentR){


    var metricScaling; 
    //metricScaling =  1 / Math.sqrt( (1 - (2 * 2.5 / currentR )))
    if (Math.abs(currentR)  >  Math.abs(data.radius)){
        metricScaling =  1 / Math.sqrt( (1 - (2 * 2.5 / currentR )))
    }
    else if (Math.abs(currentR)  ==  Math.abs(data.radius)){
        metricScaling = -1;
    }
    else {
        metricScaling = 0;
    }
    return metricScaling;
}


var createBHPath = function(){
    generatePath(true, "blackHole", segmentsBlackHole); // left path
    generatePath(false, "blackHole", segmentsBlackHole); // right path
}





/****************************
**** narrative & render ******
****************************/




var narrative = function(narrationPhase){

    if (narrationPhase == "flatPath"){


        //reset
        if(gui)
            gui.destroy();
        clearPaths(false); 
        clearSegmentsAndLabels();
        removeLabelsStarPhase();
        scene.remove(SPmesh);

        //init
        initFlatGeometry();
        playAudio('http://localhost:8080/resources/audios/EV/EV1_1.wav');
        animateFlatPath(0, 2*data.maxRadiusFactor*data.radius, 2 * 5 * data.radius );
        var finalCameraPosition = new THREE.Vector3(0,4,50);
        camMoveDirection = new THREE.Vector3(finalCameraPosition.x - camera.position.x, finalCameraPosition.y - camera.position.y, finalCameraPosition.z - camera.position.z);
        totalNumberOfCamSteps = 1500;
        camStepsIndex=0;



    }   
    else if (narrationPhase == "addStar"){
     sound.stop();
     initSphere(true);
     initWireframe("light");
     playAudio('http://localhost:8080/resources/audios/EV/EV2_0.wav');
     data.lightStar = true;

 }
 else if (narrationPhase == "massInteraction"){
    sound.stop();
        //document.getElementById('narration').innerHTML = "You can change the mass of the star to see the effect on the curvature of the 2D space";
        if(gui)
            gui.destroy();
        massInteraction(narrationPhase);
        playAudio('http://localhost:8080/resources/audios/EV/EV3_0.wav');
    }
    else if (narrationPhase == "compareDistances"){
        sound.stop();
        playAudio('http://localhost:8080/resources/audios/EV/EV4_0.wav');
        fadeOut(radialPlane);
        //fadeOut(SPmesh);
        gui.destroy();
        /*data.lightStar = true;
        createCurvedPaths(segmentsLight);*/
        //data.lightStar = true;
        updatePaths();
        initLabelsStarPhase();
        type(captionRadialPlane, "Coordinate distance (map).", 0);
        type(captionWireFrame, "Proper distances.", 0);
        massInteraction(narrationPhase);
        //compareLengthInteraction();

    }
    else if (narrationPhase == "collapse"){
        sound.stop();
        playAudio('http://localhost:8080/resources/audios/EV/EV5_0.wav');
        clearSegmentsAndLabels();
        removeLabelsStarPhase();
        if(gui)
            gui.destroy();
        allPathsDefined = false; 
        data.heavyStar = false;
        data.lightStar = false; 
        data.superHeavyStar = false; 
        updatePaths();
        fadeOut(SPmesh);
        collapseSphere();
        animateHorizon(0);
        initFlatGeometry();
        initWireframeBH();
        
    }
    else if (narrationPhase == "compareDistancesBH"){
        sound.stop();
        playAudio('http://localhost:8080/resources/audios/EV/EV6_0.wav');
        fadeOut(radialPlane);
        fadeOut(SPmesh);
        fadeOut(wireframeBH);
        createBHPath();
        initLabelsStarPhase();
        type(captionRadialPlane, "Coordinate distance (map).", 0);
        type(captionWireFrame, "Proper distances.", 0);
        allPathsDefined = true; 
        massInteraction("compareDistances");
        //data.lightStar = false; 
        //fadeOut(horizon);
        
       //massInteraction("compareDistances");

   }

   else if (narrationPhase == "restart"){
            //back to beginning
            window.location = "index.html";

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
render("flatPath");

