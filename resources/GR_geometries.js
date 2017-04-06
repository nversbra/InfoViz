
var blackHole = function (u, v) {

    rs = 0.5; 

    u = u * 10  ;
    v = v * 2 * Math.PI;
    var r =  1/4 * (4 * Math.pow(rs, 2) + Math.pow(u, 2));
    var rho;
    //if (r > rs)
    rho = Math.sqrt((r - rs) * r) + 1/2 * rs * Math.log( 2 * r  * (Math.sqrt(1 - rs/r) + 1)  - rs);
   // else
     //   rho = 0;
    var x = rho * Math.cos(v);
    var y = u - 10 ;
    var z = rho * Math.sin(v);
    return new THREE.Vector3(x, y, z);
};

var starY = function(u, density){

    var R = data.radius;  // radius of the star 
    var rmax =  5 * R; // maximal distance plotted 
    var r = u * rmax;
    var R3 = Math.pow(R,3);
    var M = (4 * Math.PI / 3) * density * R3;

    var max_y = Math.sqrt(R3 / (2 * M)) * ( 1 - Math.sqrt(1 - 2 * M / R)) + Math.sqrt(8 * M *(rmax-2*M)) - Math.sqrt(8 * M *(R-2*M));

    var y = -max_y; 

    if (M == 0)
        y = 0;
    else {
        if (r > R){
            y += Math.sqrt(R3 / (2 * M)) * ( 1 - Math.sqrt(1 - 2 * M / R)) + Math.sqrt(8 * M *(r-2*M)) - Math.sqrt(8 * M *(R-2*M));
        } 
        else {
            y+= Math.sqrt(R3 / (2 * M)) * ( 1 - Math.sqrt(1 - 2 * M * Math.pow(r,2) / R3));
        }
    }
    return y; 

}


var staticStar = function(u, v){
// u is radial distance to the center in the euclidian space
// v is the angle 

    var R = data.radius;  // radius of the star 
    var rmax =  5 * R;
    v = v * 2 * Math.PI; // v scaled to angle range 
    var y = starY(u, data.density )
    var r = u * rmax;
    var x = r * Math.cos(v);
    var z = r * Math.sin(v);
    return new THREE.Vector3(x, y, z);
}

var radialFlat = function(u, v){
// u is radial distance to the center in the euclidian space
// v is the angle 

    var density = 0; 
    var R = data.radius;  // radius of the star 
    var rmax =  5 * R;
    v = v * 2 * Math.PI; // v scaled to angle range 
    var y = starY(u, density);
    var r = u * rmax;
    var x = r * Math.cos(v);
    var z = r * Math.sin(v);
    return new THREE.Vector3(x, y, z);
}


var starPath = function(u, symmetricPart){

    var R = data.radius;  // radius of the star 
    var rmax =  5 * R;
    var y = starY(u, data.density )
    var r = u * rmax;
    
    var x = r * Math.cos(u/10);
    if (symmetricPart)
        return new THREE.Vector3(-x, y, 0);
    else 
        return new THREE.Vector3(x, y, 0);
}

var generateStarPath = function(symmetricPart, material){

    /*var material = new THREE.LineBasicMaterial({
        color: 0x0000ff
    });*/

    var geometry = new THREE.Geometry();
    var maxIndex = 5 * data.radius;
    for (i = 0; i < maxIndex ; i++) { 
        geometry.vertices.push( starPath(i/maxIndex, symmetricPart)); 
    }

    return new THREE.Line( geometry, material );
}