use std::collections::HashSet;
use std::io::Write;
use std::rc::Rc;
use std::{cell::RefCell, collections::HashMap};

use crate::colors::{CYAN, RESET};

#[derive(Debug, Clone)]
pub struct Package {
    pub name: String,
    pub build_script: Option<String>,
    pub dependency_names: Vec<String>,
}

#[derive(Debug, Clone)]
struct Node {
    id: String,
    package: Package,
    children: Vec<Rc<RefCell<Node>>>,
}

impl Node {
    pub fn new(package: Package) -> Rc<RefCell<Self>> {
        Rc::new(RefCell::new(Node {
            id: package.name.clone(),
            package,
            children: Vec::new(),
        }))
    }

    pub fn add_child(&mut self, child: Rc<RefCell<Node>>) {
        self.children.push(child);
    }

    pub fn get_dependency_build_order(&self) -> Vec<Rc<RefCell<Node>>> {
        let mut existence_set = HashSet::new();
        let mut results = Vec::new();

        for child in &self.children {
            Self::depth_first_search(child, &mut existence_set, &mut results);
        }

        results
    }

    fn depth_first_search(
        node: &Rc<RefCell<Node>>,
        existence: &mut HashSet<String>,
        result: &mut Vec<Rc<RefCell<Node>>>,
    ) {
        let id = node.borrow().id.clone();
        if existence.contains(&id) {
            return;
        }
        existence.insert(id);

        for child in &node.borrow().children {
            Self::depth_first_search(child, existence, result);
        }
        result.push(Rc::clone(node));
    }

    pub fn print<W: Write>(&self, writer: &mut W, depth: usize) -> std::io::Result<()> {
        write!(
            writer,
            "{}- {}{}{}\n",
            "  ".repeat(depth),
            CYAN,
            self.id,
            RESET
        )?;

        for child in &self.children {
            child.borrow().print(writer, depth + 1)?;
        }
        Ok(())
    }
}

pub struct Graph {
    root: Rc<RefCell<Node>>,
    node_map: HashMap<String, Rc<RefCell<Node>>>,
}

impl Graph {
    pub fn new(packages: Vec<Package>) -> Self {
        let root = Node::new(Package {
            name: "root".to_string(),
            build_script: None,
            dependency_names: vec![],
        });

        let nodes = packages
            .clone()
            .iter()
            .map(|pkg| Node::new(pkg.clone()))
            .collect::<Vec<_>>();

        // Add all dependencies to root

        for node in nodes.clone() {
            root.borrow_mut().add_child(node);
        }

        // Add dependency relationships

        let node_map = nodes
            .clone()
            .iter()
            .map(|node| (node.borrow().id.clone(), node.clone()))
            .collect::<HashMap<_, _>>();

        for package in packages {
            let package_node = node_map.get(&package.name);
            if package_node.is_none() {
                continue;
            }

            let package_node = package_node.unwrap();
            for dependency_name in package.dependency_names {
                let dependency_node = node_map.get(&dependency_name);
                if dependency_node.is_none() {
                    continue;
                }

                let dependency_node = dependency_node.unwrap();
                package_node.borrow_mut().add_child(dependency_node.clone());
            }
        }

        Graph { root, node_map }
    }

    pub fn get_overall_build_order(&self) -> Vec<String> {
        self.root
            .borrow()
            .get_dependency_build_order()
            .iter()
            .map(|node| node.borrow().package.name.clone())
            .collect()
    }

    pub fn get_package_build_order(&self, package_name: &str) -> Option<Vec<String>> {
        match self.node_map.get(package_name) {
            None => None,
            Some(node) => Some(
                node.borrow()
                    .get_dependency_build_order()
                    .iter()
                    .map(|node| node.borrow().package.name.clone())
                    .collect(),
            ),
        }
    }

    pub fn print(&self) -> std::io::Result<()> {
        println!("Dependency Graph:");
        let mut stdout = std::io::stdout().lock();
        for package_node in self.root.borrow().children.clone() {
            package_node.borrow().print(&mut stdout, 0)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use crate::graph::{Graph, Package};

    fn test_package(name: &str, dependency_names: Vec<&str>) -> Package {
        Package {
            name: name.to_string(),
            build_script: None,
            dependency_names: dependency_names.iter().map(|str| str.to_string()).collect(),
        }
    }

    #[test]
    fn test_dependency_graph() {
        let packages = vec![
            test_package("a", vec!["b", "c"]),
            test_package("b", vec!["c"]),
            test_package("c", vec![]),
        ];
        let graph = Graph::new(packages);

        assert_eq!(graph.get_overall_build_order(), vec!["c", "b", "a"]);
        assert_eq!(
            graph.get_package_build_order("a"),
            Some(vec!["c".into(), "b".into()])
        );
        assert_eq!(graph.get_package_build_order("b"), Some(vec!["c".into()]));
        assert_eq!(graph.get_package_build_order("c"), Some(vec![]));
        assert_eq!(graph.get_package_build_order("d"), None);
    }
}
