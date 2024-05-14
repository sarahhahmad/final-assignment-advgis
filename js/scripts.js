
function openAboutPopup() {
    document.getElementById("nav-about-popup").style.display = "block";
    document.getElementById("nav-popup-overlay").style.display = "block";
}

function closeAboutPopup() {
    document.getElementById("nav-about-popup").style.display = "none";
    document.getElementById("nav-popup-overlay").style.display = "none";
}

// instantiate the map (Paris)
mapboxgl.accessToken = 'pk.eyJ1Ijoic2FyYWhoYWhtYWQiLCJhIjoiY2x1bHU0NDdxMDBtcTJqb3lwcDAyM3NpMSJ9.LtM9x5jiBhMAt00hdlBVyw';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12', //street map style 
    center: [2.29633, 48.86048], //starting position centered on Paris
    zoom: 11.7 // starting zoom view
});


// add a navigation control
map.addControl(new mapboxgl.NavigationControl());

// wait! don't execute this code until the map is finished it's initial load
map.on('load', () => {

    //add geojson source for clipping mask
    map.addSource('inverted', {
        "type": "geojson",
        "data": "data/inverted.geojson",
    })

    // add a geojson source for Paris administrative border
    map.addSource('paris-districts', {
        "type": "geojson",
        "data": "data/paris-districts.geojson",
    })

    // add a geojson source for Areas identified as Social Housing Deficit Zones (PLU)
    map.addSource('deficit', {
        "type": "geojson",
        "data": "data/deficit.geojson",
    })

    //add geojson source for Areas identified as no Social Housing Deficit Zones
    map.addSource('no-deficit', {
        "type": "geojson",
        "data": "data/no-deficit.geojson",
    })

    //add geojson source for Special Preservation Districts
    map.addSource('special-districts', {
        "type": "geojson",
        "data": "data/special-districts.geojson",
    })

    //add geojson source for social housing units built since 2000
    map.addSource('housing-units', {
        "type": "geojson",
        "data": "data/housing-units.geojson",
    })


    //adding fill layer for clipping mask, so that only Paris boundaries are highlighted
    map.addLayer({
        id: 'inverted-fill',
        type: 'fill',
        source: 'inverted',
        paint: {
            'fill-color': "gray",
            'fill-opacity': .8,
        }
    });

    //adding circle layer to visualize housing units constructed since 2000 as points
    map.addLayer({
        id: 'housing-units-circle',
        type: 'circle',
        source: 'housing-units',
        paint: {
            'circle-color': "#0868ac",
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                11.7, 2,
                18, 15
            ],
            'circle-opacity': 1
        },
        layout: {
            'visibility': 'none'
        }
    })

    //add a fill layer, each arrondissement getting a color based on the percentage of the city's social housing units it has 
    map.addLayer({
        id: 'paris-districts-fill',
        type: 'fill',
        source: 'paris-districts',
        layout: {
            'visibility': 'visible' //make layer visible by default
        },
        paint: {
            'fill-color': [
                'match',
                ['get', 'percentsruclass'],
                'under5', '#edf8fb',
                '5to10', '#bfd3e6',
                '10to15', '#9ebcda',
                '15to20', '#8c96c6',
                '20to25', '#8856a7',
                'over25', '#810f7c',
                '#ccc'
            ],
            'fill-opacity': .6

        }
    }, 'path-pedestrian-label');


    // add a line layer using the arrondissement boundaries
    map.addLayer({
        'id': 'paris-districts-line',
        'type': 'line',
        'source': 'paris-districts',
        'layout': {},
        'paint': {
            'line-color': '#C4C6C8',
            'line-width': .75
        }
    }, 'path-pedestrian-label');

    // add a line layer for highlighting clicked arrondissement
    map.addLayer({
        id: 'highlight-line',
        type: 'line',
        source: 'paris-districts',
        paint: {
            'line-color': '#04E7FF', // Adjust color as needed
            'line-width': 2
        },
        filter: ['==', 'name3', ''] // Initially hide the line layer
    });

    //visualize deficit zones

    map.addLayer({
        id: 'deficit-fill',
        type: 'fill',
        source: 'deficit',
        minizoom: 5,
        paint: {
            'fill-color': '#fb6a4a',
            'fill-opacity': .5
        }
    }, 'path-pedestrian-label');

    map.addLayer({
        id: 'deficit-line',
        type: 'line',
        source: 'deficit',
        paint: {
            'line-color': '#C4C6C8',
            'line-width': 1
        }
    }, 'path-pedestrian-label');

    //visualize special preservation districts
    map.addLayer({
        id: 'special-districts-line',
        type: 'line',
        source: 'special-districts',
        paint: {
            'line-color': 'red',
            'line-width': 3
        }
    }, 'path-pedestrian-label');


    //making sure dataset2 (Social Housing Deficit Zones) isn't visible when map first loads. 
    layerGroups.dataset2.forEach(layerId => {
        map.setLayoutProperty(layerId, 'visibility', 'none');
    });

    //toggle function for accordion in sidebar 

    function toggleAccordion(id) {
        var element = document.getElementById(id);
        if (element.classList.contains('show')) {
            element.classList.remove('show');
        } else {
            var accordionItems = document.querySelectorAll('.accordion-collapse');
            accordionItems.forEach(item => {
                item.classList.remove('show');
            });
            element.classList.add('show');
        }
    }


    // Attach event listener to the Housing Units button
    document.getElementById('toggleHousingUnitsButton').addEventListener('click', function () {
        toggleHousingUnitsLayer();
    });

    // Function to toggle the housing units layer visibility
    function toggleHousingUnitsLayer() {
        const housingUnitsLayerId = 'housing-units-circle';
        const currentVisibility = map.getLayoutProperty(housingUnitsLayerId, 'visibility');

        // Toggle visibility
        if (currentVisibility === 'visible') {
            map.setLayoutProperty(housingUnitsLayerId, 'visibility', 'none');
        } else {
            map.setLayoutProperty(housingUnitsLayerId, 'visibility', 'visible');
        }
    }

    // Event listener for click on arrondissements
    map.on('click', 'paris-districts-fill', function (e) {
        var clickedFeature = e.features[0];
        highlightFeature(clickedFeature);
        showPopup(clickedFeature);
    });

});

// Function to highlight clicked arrondissement
function highlightFeature(feature) {
    map.setFilter('highlight-line', ['==', 'name3', feature.properties.name3]);
}



// Function to show popup with information about social housing percentages and inventory
//since geojson was originally from a shapefile, I wanted to make sure that the pop up was showing up in the center of each arrondissement instead of snapping to the polygon line. so I asked ChatGPT for some help and it had me download a program that can calculate the center of each polygon (arrondissement) 
function showPopup(feature) {
    var centroid = turf.centroid(feature).geometry.coordinates; // Calculate centroid using turf.js
    var description = '<h3>' + feature.properties.name3 + ' | <br>' + feature.properties.neighborhoodname + '</h3>' +
        '<p><strong>Percent of Citywide Social Housing Units: </strong>' + feature.properties.percsocialhousing + '</p>' +
        '<p><strong>Number of Social Housing Units: </strong>' + feature.properties.units + '</p>';

    // Ensure that the popup is not already open
    if (!map.getLayer('popup')) {
        var popup = new mapboxgl.Popup({ closeOnClick: true })
            .setLngLat(centroid) // Set the centroid as the popup location
            .setHTML(description)
            .addTo(map);
    }


    // Change the cursor to a pointer when
    // the mouse is over the states layer.
    map.on('mouseenter', 'paris-districts-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    // Change the cursor back to a pointer
    // when it leaves the states layer.
    map.on('mouseleave', 'paris-districts-fill', () => {
        map.getCanvas().style.cursor = '';
    });
}

// Define layer groups, grouping layers into datasets
const layerGroups = {
    dataset1: ['paris-districts-fill', 'paris-districts-line', 'highlight-line'], // Layers for dataset 1
    dataset2: ['deficit-fill', 'deficit-line', 'special-districts-line'] // Layers for dataset 2
};

// Toggle layer group visibility
function toggleLayerGroup(groupName) {
    const layers = layerGroups[groupName];
    const legend = document.getElementById('legend');
    const legend2 = document.getElementById('legend2');
    // First, hide all layers
    Object.keys(layerGroups).forEach(group => {
        layerGroups[group].forEach(layerId => {
            map.setLayoutProperty(layerId, 'visibility', 'none');
        });
    });
    // Then, show layers for the selected group
    layers.forEach(layerId => {
        map.setLayoutProperty(layerId, 'visibility', 'visible');
    });


    // Show or hide the legend based on the selected group
    if (groupName === 'dataset1') {
        legend.style.display = 'block';
        legend2.style.display = 'none'; // Hide legend2
    } else {
        legend.style.display = 'none'; // Hide legend
        legend2.style.display = 'block'; // Show legend2
    }
}


// Attach event listeners to buttons
document.getElementById('toggleDataset1Button').addEventListener('click', function () {
    toggleLayerGroup('dataset1');
});

document.getElementById('toggleDataset2Button').addEventListener('click', function () {
    toggleLayerGroup('dataset2');
});
