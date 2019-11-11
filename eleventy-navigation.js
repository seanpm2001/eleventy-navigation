const DepGraph = require("dependency-graph").DepGraph;

function findNavigationEntries(nodes = [], key = "") {
	let pages = [];
	for(let entry of nodes) {
		if(entry.data && entry.data.eleventyNavigation) {
			let nav = entry.data.eleventyNavigation;
			if(!key && !nav.parent || nav.parent === key) {
				pages.push(Object.assign({}, nav, {
					url: entry.data.page.url,
					pluginType: "eleventy-navigation"
				}, key ? { parentKey: key } : {}));
			}
		}
	}

	return pages.sort(function(a, b) {
		return (a.order || 0) - (b.order || 0);
	}).map(function(entry) {
		if(!entry.title) {
			entry.title = entry.key;
		}
		if(entry.key) {
			entry.children = findNavigationEntries(nodes, entry.key);
		}
		return entry;
	});
}

function findDependencies(pages, depGraph, parentKey) {
	for( let page of pages ) {
		depGraph.addNode(page.key, page);
		if(parentKey) {
			depGraph.addDependency(page.key, parentKey)
		}
		if(page.children) {
			findDependencies(page.children, depGraph, page.key);
		}
	}
}

function findBreadcrumbEntries(nodes, activeKey) {
	let pages = findNavigationEntries(nodes);
	let graph = new DepGraph();
	findDependencies(pages, graph);

	return activeKey ? graph.dependenciesOf(activeKey).map(key => {
		let data = Object.assign({}, graph.getNodeData(key));
		delete data.children;
		return data;
	}) : [];
}

function navigationToHtml(pages, options = {}) {
	options = Object.assign({
		listElement: "ul",
		listItemElement: "li",
		listClass: "",
		listItemClass: "",
		activeKey: "",
		activeListItemClass: "",
		showExcerpt: false,
		isChildList: false
	}, options);

	let isChildList = !!options.isChildList;
	options.isChildList = true;

	if(pages.length && pages[0].pluginType !== "eleventy-navigation") {
		throw new Error("Incorrect argument passed to eleventyNavigationToHtml filter. You must call `eleventyNavigation` or `eleventyNavigationBreadcrumb` first, like: `collection.all | eleventyNavigation | eleventyNavigationToHtml(page.url) | safe`");
	}

	return pages.length ? `<${options.listElement}${!isChildList && options.listClass ? ` class="${options.listClass}"` : ''}>${pages.map(entry => {
		let liClass = [];
		if(options.listItemClass) {
			liClass.push(options.listItemClass);
		}
		if(options.activeKey === entry.key && options.activeListItemClass) {
			liClass.push(options.activeListItemClass);
		}

		return `<${options.listItemElement}${liClass.length ? ` class="${liClass.join(" ")}"` : ''}><a href="${entry.url}">${entry.title}</a>${options.showExcerpt && entry.excerpt ? `: ${entry.excerpt}` : ""}${entry.children ? navigationToHtml(entry.children, options) : ""}</${options.listItemElement}>`;
	}).join("\n")}</${options.listElement}>` : "";
}

module.exports = {
	findNavigationEntries,
	findBreadcrumbEntries,
	toHtml: navigationToHtml
};