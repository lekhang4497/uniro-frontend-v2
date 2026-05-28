// Recursively walk a rule tree, emitting errors for malformed nodes and
// records of every leaf reference encountered (for the unreferenced-signal
// warning).
//
// Node taxonomy (ROUTER_YAML.md §7):
//   * Leaf      — has `name` and `type`, no `operator`/`conditions`.
//   * Composite — has `operator` (AND|OR|NOT) and `conditions` array.
//                 NOT must have exactly one child; AND/OR ≥1.
//
// A node with both leaf and composite shapes is invalid. So is an empty
// object.

import { pathJoin } from "./paths.js";

const VALID_OPERATORS = new Set(["AND", "OR", "NOT"]);

function isPlainObject(x) {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

export function walkRule(node, path, declaredSignals, projectionNames, errors, referencedLeaves) {
  if (!isPlainObject(node)) {
    errors.push({
      path,
      code: "invalid_node_not_mapping",
      message: `Rule node at ${path} must be a mapping.`,
    });
    return;
  }

  const hasOperator = node.operator !== undefined && node.operator !== null;
  const hasName = node.name !== undefined && node.name !== null;
  const hasType = node.type !== undefined && node.type !== null;
  const hasConditions = node.conditions !== undefined && node.conditions !== null;

  if (!hasOperator && !hasName && !hasType && !hasConditions) {
    errors.push({
      path,
      code: "invalid_node_empty",
      message: `Rule node at ${path} is empty; expected a leaf {type,name} or a composite {operator,conditions}.`,
    });
    return;
  }

  // Mixed-shape: both leaf-ish and composite-ish keys present.
  if ((hasOperator || hasConditions) && (hasName || hasType)) {
    errors.push({
      path,
      code: "invalid_node_both_leaf_and_composite",
      message: `Rule node at ${path} mixes composite (operator/conditions) and leaf (name/type) shapes.`,
    });
    return;
  }

  if (hasOperator || hasConditions) {
    validateComposite(node, path, declaredSignals, projectionNames, errors, referencedLeaves);
    return;
  }

  validateLeaf(node, path, declaredSignals, projectionNames, errors, referencedLeaves);
}

function validateComposite(
  node,
  path,
  declaredSignals,
  projectionNames,
  errors,
  referencedLeaves
) {
  const opRaw = node.operator;
  if (typeof opRaw !== "string") {
    errors.push({
      path: pathJoin(path, "operator"),
      code: "invalid_operator",
      message: `Composite at ${path} 'operator' must be a string (AND|OR|NOT).`,
    });
    return;
  }
  const op = opRaw.toUpperCase();
  if (!VALID_OPERATORS.has(op)) {
    errors.push({
      path: pathJoin(path, "operator"),
      code: "invalid_operator",
      message: `Composite at ${path} has unknown operator '${opRaw}' (expected AND|OR|NOT).`,
    });
    return;
  }

  if (!Array.isArray(node.conditions) || node.conditions.length < 1) {
    errors.push({
      path: pathJoin(path, "conditions"),
      code: "invalid_operator",
      message: `Composite at ${path} (${op}) must have at least one condition.`,
    });
    return;
  }

  if (op === "NOT" && node.conditions.length !== 1) {
    errors.push({
      path: pathJoin(path, "conditions"),
      code: "not_arity",
      message: `NOT operator at ${path} requires exactly one condition (got ${node.conditions.length}).`,
    });
    // Still walk children so we surface deeper issues.
  }

  for (let i = 0; i < node.conditions.length; i++) {
    const childPath = pathJoin(pathJoin(path, "conditions"), i);
    walkRule(
      node.conditions[i],
      childPath,
      declaredSignals,
      projectionNames,
      errors,
      referencedLeaves
    );
  }
}

function validateLeaf(node, path, declaredSignals, projectionNames, errors, referencedLeaves) {
  if (typeof node.name !== "string" || node.name === "") {
    errors.push({
      path: pathJoin(path, "name"),
      code: "unresolved_leaf",
      message: `Leaf at ${path} must have a string 'name'.`,
    });
    return;
  }
  if (typeof node.type !== "string" || node.type === "") {
    errors.push({
      path: pathJoin(path, "type"),
      code: "unresolved_leaf",
      message: `Leaf at ${path} must have a string 'type'.`,
    });
    return;
  }

  referencedLeaves.add(node.name);

  const declaredType = declaredSignals.get(node.name);
  if (declaredType !== undefined) {
    if (node.type !== declaredType.type) {
      errors.push({
        path: pathJoin(path, "type"),
        code: "leaf_type_mismatch",
        message: `Leaf '${node.name}' has type '${node.type}' but signal is declared as type '${declaredType.type}'.`,
      });
    }
    return;
  }

  if (projectionNames.has(node.name)) {
    if (node.type !== "projection") {
      errors.push({
        path: pathJoin(path, "type"),
        code: "leaf_type_mismatch",
        message: `Leaf '${node.name}' references a projection output but type is '${node.type}'; expected 'projection'.`,
      });
    }
    return;
  }

  errors.push({
    path: pathJoin(path, "name"),
    code: "unresolved_leaf",
    message: `Leaf '${node.name}' is not a declared signal or projection output.`,
  });
}
