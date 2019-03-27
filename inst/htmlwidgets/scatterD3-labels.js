


function labels_create(chart) {

    if (!chart.settings().has_labels) return;

    var labels = chart.svg().select(".chart-body")
        .selectAll(".point-label")
        .data(chart.data(), key);

    var labels_elements = labels.enter()
        .append("text")
        .call(label_init)
        .call(label_formatting, chart)
        .call(drag_behavior(chart));

    // Automatic label placement
    if (chart.settings().labels_positions == "auto") {
        // Compute position
        var label_array = labels_placement(labels_elements, chart);
        // Update labels data with new position
        chart.data().forEach(function (d, i) {
            d.lab_dx = label_array[i].x - chart.scales().x(d.x);
            d.lab_dy = label_array[i].y - chart.scales().y(d.y);
        })
        // Redraw
        labels_elements
            .data(chart.data(), key)
            .attr("text-anchor", "start")
            .call(label_formatting, chart);
    }
}


function labels_update(chart) {

    if (!chart.settings().has_labels) return;

    var labels = chart.svg().select(".chart-body")
        .selectAll(".point-label")
        .data(chart.data(), key);
    labels.enter()
        .append("text")
        .call(label_init)
        .call(drag_behavior(chart))
        .merge(labels)
        .transition().duration(1000)
        .call(label_formatting, chart);

    labels.exit()
        .transition().duration(1000)
        .attr("transform", "translate(0,0)")
        .remove();

    if (chart.settings().has_labels_changed) {
        var label_export = d3v5.select("#scatterD3-menu-" + chart.settings().html_id)
            .select(".label-export");
        label_export.style("display", chart.settings().has_labels ? "block" : "none");
    }

}


// Initial text label attributes
function label_init(selection) {
    selection
        .attr("text-anchor", "middle");
}

// Compute default vertical offset for labels
function default_label_dy(size, y, type_var, labels_size) {
    if (y < 0 && type_var !== undefined && type_var == "arrow") {
        return (Math.sqrt(size) / 2) + labels_size + 2;
    }
    else {
        return (-Math.sqrt(size) / 2) - 6;
    }
}

// Compute label x position
function get_label_dx(d, i, chart) {
    // Manually defined
    if (d.lab_dx !== undefined) return (d.lab_dx);
    // From labels_positions argument
    if (chart.settings().labels_positions && chart.settings().labels_positions != "auto") {
        var dx = chart.scales().x(chart.settings().labels_positions[i].lab_x) - chart.scales().x(d.x);
        return dx;
    }
    // Default
    return ("0");
}

// Compute label y position
function get_label_dy(d, i, chart) {
    // Manually defined
    if (d.lab_dy !== undefined) return (d.lab_dy);
    // From labels_positions argument
    if (chart.settings().labels_positions && chart.settings().labels_positions != "auto") {
        var dy = chart.scales().y(chart.settings().labels_positions[i].lab_y) - chart.scales().y(d.y);
        return dy;
    }
    // Default
    var size = (d.size_var === undefined) ? chart.settings().point_size : chart.scales().size(d.size_var);
    return default_label_dy(size, d.y, d.type_var, chart.settings().labels_size);
}

// Apply format to text label
function label_formatting(selection, chart) {

    var sel = selection
        .text(function (d) { return (d.lab); })
        .style("font-size", chart.settings().labels_size + "px")
        .attr("class", function (d, i) { return "point-label color color-c" + css_clean(d.col_var) + " symbol symbol-c" + css_clean(d.symbol_var); })
        .attr("transform", function (d) { return translation(d, chart.scales()); })
        .style("fill", function (d) { return chart.scales().color(d.col_var); })
        .attr("dx", function (d, i) {
            return get_label_dx(d, i, chart) + "px";
        })
        .attr("dy", function (d, i) {
            return get_label_dy(d, i, chart) + "px";
        });

    return sel;
}

// Compute automatic label placement
function labels_placement(selection, chart) {
    var label_array = [];
    var anchor_array = [];
    var nsweeps = 1000;
    var index = 0;

    selection.each(function (d) {
        label_array[index] = {};
        label_array[index].width = this.getBBox().width;
        label_array[index].height = this.getBBox().height;
        label_array[index].x = chart.scales().x(d.x);
        label_array[index].y = chart.scales().y(d.y);
        label_array[index].name = d.lab;
        anchor_array[index] = {};
        anchor_array[index].x = chart.scales().x(d.x);
        anchor_array[index].y = chart.scales().y(d.y);
        anchor_array[index].r = Math.sqrt(dot_size(d, chart));
        index += 1;
    });

    d3v5.labeler()
        .label(label_array)
        .anchor(anchor_array)
        .width(chart.dims().width)
        .height(chart.dims().height)
        .start(nsweeps);

    return (label_array);

}

// Drag behavior
function drag_behavior(chart) {

    var settings = chart.settings();
    var scales = chart.scales();

    // Text labels dragging function
    var drag = d3v5.drag()
        .subject(function (d, i) {
            var size = (d.size_var === undefined) ? settings.point_size : scales.size(d.size_var);
            var dx = get_label_dx(d, i, chart);
            var dy = get_label_dy(d, i, chart);
            return { x: scales.x(d.x) + dx, y: scales.y(d.y) + dy };
        })
        .on('start', function (d, i) {
            if (!d3v5.event.sourceEvent.shiftKey) {
                dragging = true;
                d3v5.select(this).style('fill', '#000');
                var dx = get_label_dx(d, i, chart);
                var dy = get_label_dy(d, i, chart);
                chart.svg().select(".chart-body")
                    .append("svg:line")
                    .attr("id", "scatterD3-drag-line")
                    .attr("x1", scales.x(d.x)).attr("x2", scales.x(d.x) + dx)
                    .attr("y1", scales.y(d.y)).attr("y2", scales.y(d.y) + dy)
                    .style("stroke", "#000")
                    .style("opacity", 0.3);
            }
        })
        .on('drag', function (d) {
            if (dragging) {
                var cx = d3v5.event.x - scales.x(d.x);
                var cy = d3v5.event.y - scales.y(d.y);
                d3v5.select(this)
                    .attr('dx', cx + "px")
                    .attr('dy', cy + "px");
                d3v5.select("#scatterD3-drag-line")
                    .attr('x2', scales.x(d.x) + cx)
                    .attr("y2", scales.y(d.y) + cy);
                d.lab_dx = cx;
                d.lab_dy = cy;
            }
        })
        .on('end', function (d) {
            if (dragging) {
                d3v5.select(this).style('fill', scales.color(d.col_var));
                d3v5.select("#scatterD3-drag-line").remove();
                dragging = false;
            }
        });

    return drag;

}