Rickshaw.namespace('Rickshaw.Graph.Renderer.Multi');

Rickshaw.Graph.Renderer.Multi = Rickshaw.Class.create( Rickshaw.Graph.Renderer, {

	name: 'multi',

	initialize: function($super, args) {

		$super(args);
	},

	defaults: function($super) {

		return Rickshaw.extend( $super(), {
			unstack: true,
			fill: false,
			stroke: true
		} );
	},

	configure: function($super, args) {

		args = args || {};
		this.config = args;
		$super(args);
	},

	domain: function($super) {
		this.graph.stackData();

		var domains = [];

		var groups = this._groups();
		this._stack(groups);

		groups.forEach( function(group) {

			var data = group.series
				.filter( function(s) { return !s.disabled } )
				.map( function(s) { return s.stack });

			if (!data.length) return;
			
			var domain = null;
			if (group.renderer && group.renderer.domain) {
				domain = group.renderer.domain(data);
			}
			else {
				domain = $super(data);
			}
			domains.push(domain);
		});

		var xMin = d3.min(domains.map( function(d) { return d.x[0] } ));
		var xMax = d3.max(domains.map( function(d) { return d.x[1] } ));
		var yMin = d3.min(domains.map( function(d) { return d.y[0] } ));
		var yMax = d3.max(domains.map( function(d) { return d.y[1] } ));

		return { x: [xMin, xMax], y: [yMin, yMax] };
	},

	_groups: function() {

		var graph = this.graph;

		var renderGroups = {};

		graph.series.forEach( function(series) {

			if (series.disabled) return;

			if (!renderGroups[series.renderer]) {

				var ns = "http://www.w3.org/2000/svg";
				var vis = document.createElementNS(ns, 'g');

				graph.vis._groups[0][0].appendChild(vis);

				var renderer = graph._renderers[series.renderer];

				var config = {};

				var defaults = [ this.defaults(), renderer.defaults(), this.config, this.graph ];
				defaults.forEach(function(d) { Rickshaw.extend(config, d) });

				renderer.configure(config);

				renderGroups[series.renderer] = {
					renderer: renderer,
					series: [],
					vis: d3.select(vis)
				};
			}
				
			renderGroups[series.renderer].series.push(series);

		}, this);

		var groups = [];

		Object.keys(renderGroups).forEach( function(key) {
			var group = renderGroups[key];
			groups.push(group);
		});

		return groups;
	},

	_stack: function(groups) {

		groups.forEach( function(group) {
			if (group.renderer.unstack) {
				group.series.forEach(function(series) {
					series.stack = series.stack.map(function(d) {
						return Rickshaw.extend({y0: 0}, d);
					});
				});
				return;
			}

			var series = group.series
				.filter( function(series) { return !series.disabled } );

			var data = series
				.map( function(series) { return series.stack } );

			var stackedData = Rickshaw.stack(data, group.renderer.offset || d3.stackOffsetNone);

			series.forEach( function(series, index) {
				series.stack = Rickshaw.clone(stackedData[index]);
			});

		}, this );

		return groups;

	},

	render: function() {

		this.graph.series.forEach( function(series) {
			if (!series.renderer) {
				throw new Error("Each series needs a renderer for graph 'multi' renderer");
			}
		});

		this.graph.vis.selectAll('*').remove();

		var groups = this._groups();
		groups = this._stack(groups);

		groups.forEach( function(group) {

			var series = group.series
				.filter( function(series) { return !series.disabled } );

			series.active = function() { return series };

			group.renderer.render({ series: series, vis: group.vis });
		});
	}

} );
