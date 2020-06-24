class VizGraphNode {
    constructor(position) {
        this.position = position;
        this.parents = [];
        this.children = [];
        this.selected = false;
    }

    add_parent(node) {
        this.parents.push(node);
    }

    add_child(node) {
        if (!this.has_child(node)) this.children.push(node);
    }

    has_child(node) {
        return this.children.includes(node);
    }

    is_hovering(coord, radius) {
        let x = this.position.x - coord.x;
        let y = this.position.y - coord.y;
        return Math.hypot(x,y) <= radius;
    }

    toggle_selected() {
        this.selected = !this.selected;
    }

    // At any given moment, every node should have different x,y coordinate
    // So the x,y positions work as a unique hash
    hash() {
        return this.position.x.toString() + this.position.y.toString();
    }
}


class VizGraph {
    constructor() {
        this.nodes = [];

        this.canvas = document.createElement('canvas');
        document.body.appendChild(this.canvas);
        this.context = this.canvas.getContext("2d");

        this.specs = {
            background : '#848484',
            widthScale : 1,
            heightScale : 1,
            radius : 39,
            edgeWidth : 8.5,
            edgeColor : '#000000',
            arrowLength : 20,
            selectionWidth : 15,
            selectionColor : '#6969fa',
            circleColor : '#f0fd96',
            idColor : '#000000',
            idFontSize : 60,
            idFont : 'Arial'
        }

        this.update_canvas();
    }

    has_selected() {
        this.nodes.forEach(node => { if (node.selected) return true; });
        return false;
    }

    update_canvas() {
        this.canvas.style.background = this.specs.background;
        this.canvas.width  = (window.innerWidth * this.specs.widthScale).toString();
        this.canvas.height = (window.innerHeight * this.specs.heightScale).toString();
        this.draw_graph();
    }


    create_node(coord) {
        this.nodes.push(new VizGraphNode(coord));
    }

    /**
     *  Returns the first node that contains the given coordinate
     *  Return null if no nodes contain 'coord'
     *  @param {*}         coord - {x : Number, y : Number} coordinate to compare
     *  @param {VizGraphNode} node  - {VizGraphNode} Optionally specify single node to ignore
     */ 
    hovering(coord, scale=2, ignore_node=null) {
        for (let node of this.nodes) {
            if (node == ignore_node) continue;
            if (node.is_hovering(coord, this.specs.radius * scale)) {
                return node;
            }
        }
        return null;
    }

    // Draw the environment graph
    draw_graph() {
        // Clear canvas first
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        let edge_pairs = {};

        // Draw all edges between nodes
        for (let node of this.nodes) {
            for (let child of node.children) {
                // Make sure not to duplicate drawing an edge
                if (!edge_pairs.hasOwnProperty(child.hash() + '->' + node.hash())) {
                    this.draw_edge(node.position, child.position);
                    edge_pairs[node.hash() + '->' + child.hash()] = true;
                }
                this.draw_arrow(node.position, child.position);
            }
        }

        // Draw each node
        let count = 0;
        for (let node of this.nodes) {
            this.draw_node(node, count++);
        }
    }

    draw_arrow(coord1, coord2) {
        let points = this.calculate_arrows(coord1, coord2);
        this.draw_line(points.start, points.ends[0], this.specs.edgeWidth / 2);
        this.draw_line(points.start, points.ends[1], this.specs.edgeWidth / 2);
    }

    draw_node(node, id) {
        let x = node.position.x; 
        let y = node.position.y;

        this.context.beginPath();
        this.context.arc(x, y, this.specs.radius, 0, 2 * Math.PI);
        this.context.fillStyle = this.specs.circleColor;
        if (node.selected) {
            this.context.strokeStyle = this.specs.selectionColor;
            this.context.lineWidth = this.specs.selectionWidth; 
            this.context.stroke();
        }
        this.context.fill();
    
        this.context.font = this.specs.idFontSize + 'px ' + this.specs.idFont;
        this.context.fillStyle = this.specs.idColor;
        this.context.textAlign = "center";
        this.context.fillText(id.toString(), x, y + this.specs.idFontSize / 3);
    }

    draw_edge(coord1, coord2) {
        let chopped_coords = this.calculate_edge_pair(coord1, coord2);
        this.draw_line(chopped_coords[0], chopped_coords[1]);
    }
    
    draw_moving_edge(node_coord, mouse_coord) {
        let chopped_coords = this.calculate_edge_pair(node_coord, mouse_coord);
        this.draw_line(chopped_coords[0], mouse_coord);
    }
    
    draw_line(coord1, coord2, width=this.specs.edgeWidth, color=this.specs.edgeColor) {
        this.context.beginPath();
        this.context.moveTo(coord1.x, coord1.y);
        this.context.lineTo(coord2.x, coord2.y);
        this.context.lineWidth = width;
        this.context.strokeStyle = color;
        this.context.stroke();
    }

    clear_selections() {
        for (let node of this.nodes) {
            node.selected = false;
        }
    }

    draw_rect(coord1, coord2, width=this.specs.edgeWidth/3) {
        let tleft = {
            x : Math.min(coord1.x, coord2.x),
            y : Math.min(coord1.y, coord2.y)
        }
        let bright = {
            x : Math.max(coord1.x, coord2.x),
            y : Math.max(coord1.y, coord2.y)
        }

        this.draw_line(tleft, { x : bright.x, y : tleft.y }, width,this.specs.selectionColor);
        this.draw_line({ x : bright.x, y : tleft.y }, bright, width, this.specs.selectionColor);
        this.draw_line(bright, { x : tleft.x, y : bright.y }, width, this.specs.selectionColor);
        this.draw_line({ x : tleft.x, y : bright.y }, tleft, width, this.specs.selectionColor);
    }

    move_selected(deltaCoord) {
        this.nodes.forEach(node => {
            if (node.selected) {
                node.position.x += deltaCoord.x;
                node.position.y += deltaCoord.y;
            }
        });
    }

    select_in_rect(coord1, coord2) {
        let tleft = {
            x : Math.min(coord1.x, coord2.x),
            y : Math.min(coord1.y, coord2.y)
        }
        let bright = {
            x : Math.max(coord1.x, coord2.x),
            y : Math.max(coord1.y, coord2.y)
        }

        for (let node of this.nodes) {
            let pos = node.position;
            if (pos.x >= tleft.x && pos.x <= bright.x &&
                pos.y >= tleft.y && pos.y <= bright.y) {
                    node.selected = true;
            }
            else {
                node.selected = false;
            }
        }
    }

    march_towards(coord1, coord2) {
        let chopped_coords = this.calculate_edge_pair(coord1, coord2);
        let theta = chopped_coords[2];

        let prev_coord = {
            x : chopped_coords[0].x - 0.01 * Math.cos(theta),
            y : chopped_coords[0].y - 0.01 * Math.sin(theta)
        };

        let isclose = (c1, c2, tol=0.1) => {
            return Math.abs(c2.x - c1.x) < tol && Math.abs(c2.y - c1.y) < tol;
        }
        
        let count = 0;
        while (count < 0 && !isclose(prev_coord, coord2) && !this.hovering(prev_coord, 1)) {
            let iter_coord = {
                x : prev_coord.x - 0.01 * Math.cos(theta),
                y : prev_coord.y - 0.01 * Math.sin(theta)
            };
            this.draw_line(prev_coord, iter_coord);
            prev_coord = iter_coord;
            ++count;
        }
    }
    
    calculate_arrows(coord1, coord2) {
        let chopped_coords = this.calculate_edge_pair(coord1, coord2);

        let x1 = chopped_coords[0].x; let x2 = chopped_coords[1].x;
        let y1 = chopped_coords[0].y; let y2 = chopped_coords[1].y;
    
        let length = Math.hypot(x2 - x1, y2 - y1) / 3;
    
        let start_point = {theta : null, x : null, y : null};
        start_point.theta = x1 == x2 ? Math.PI / 2 * (y2 < y1 ? 1 : -1) : Math.atan2((y1-y2) , (x1 - x2));
        start_point.x = x1 - length * Math.cos(start_point.theta);
        start_point.y = y1 - length * Math.sin(start_point.theta);

        let end_points = [{ x : start_point.x + this.specs.arrowLength * Math.cos(start_point.theta + Math.PI/4),
                        y : start_point.y + this.specs.arrowLength * Math.sin(start_point.theta + Math.PI/4) },
                      { x : start_point.x + this.specs.arrowLength * Math.cos(start_point.theta - Math.PI/4),
                        y : start_point.y + this.specs.arrowLength * Math.sin(start_point.theta - Math.PI/4) }];
        return {'start' : start_point, 'ends' : end_points};
    }

    calculate_edge_pair(coord1, coord2) {
        let x1 = coord1.x; let x2 = coord2.x;
        let y1 = coord1.y; let y2 = coord2.y;
    
        let theta = x1 == x2 ? Math.PI / 2 * (y2 < y1 ? 1 : -1) : Math.atan2((y1-y2) , (x1 - x2));
        let result = [{x : null, y : null}, {x : null, y : null}, theta];

        result[0].x = x1 - this.specs.radius * Math.cos(theta);
        result[0].y = y1 - this.specs.radius * Math.sin(theta);
        result[1].x = x2 + this.specs.radius * Math.cos(theta);
        result[1].y = y2 + this.specs.radius * Math.sin(theta);
        return result;
    }
};
