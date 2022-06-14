export const MyReact = {
  createElement,
  render,
  useState,
};

let nextUnitOfWork = null;
let workingRoot = null;
let currentRoot = null;
let deleteFiber = [];
let hookIndex = null;
let workingFiber = null;

// Создание объекта элемента
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children
        .flat()
        .map((child) =>
          typeof child === "object" ? child : createTextElement(child)
        ),
    },
  };
}

// Создание примитивного элемента(строка, число)
function createTextElement(nodeValue) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue,
      children: [],
    },
  };
}

// Функция рендера root компонента
function render(element, container) {
  workingRoot = {
    node: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  };
  deleteFiber = [];
  nextUnitOfWork = workingRoot;
}

// Создание ноды
function createNode(fiber) {
  const node =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);

  const isProperty = (key) => key !== "children";

  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach((key) => {
      if (key.toLowerCase().startsWith("on")) {
        let eventType = key.toLowerCase().substring(2);
        node.addEventListener(eventType, fiber.props[key]);
      } else {
        node[key] = fiber.props[key];
      }
    });

  return node;
}

// Цикл выполняющий работу только когда свободен основной стек выполнения
function workLoop(deadline) {
  while (nextUnitOfWork && deadline.timeRemaining() > 0) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }

  if (!nextUnitOfWork && workingRoot) {
    commitRoot(deleteFiber, workingRoot, currentRoot);
  }

  requestIdleCallback(workLoop);
}

// Функция которая ведет основную работу по обработке fiber,
// создает ноду и добавляет новый fiber в потомки или соседи
function performUnitOfWork(fiber) {
  const isFunctionComponent = typeof fiber.type === "function";

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }

    nextFiber = nextFiber.parent;
  }
}

// Обработка функционального компонента, так как type является функцией, 
// то вызывая мы получаем дочерние компоненты
function updateFunctionComponent(fiber) {
  workingFiber = fiber;
  hookIndex = 0;
  workingFiber.hooks = [];

  let children = [fiber.type(fiber.props)];

  reconcileChildren(fiber, children);
}

function updateHostComponent(fiber) {
  if (!fiber.node) {
    fiber.node = createNode(fiber);
  }

  const elements = fiber.props.children;

  reconcileChildren(fiber, elements);
}

// Функция согласования отвечающия за обновление, добавление и удаление fiber
function reconcileChildren(currentFiber, elements) {
  let index = 0;
  let prevSibling = null;
  let oldFiber = currentFiber.alternate && currentFiber.alternate.child;

  while (index < elements.length || oldFiber != null) {
    let newFiber = null;
    const element = elements[index];
    const sameType = oldFiber && element && element.type === oldFiber.type;

    // Если тип fiber такой же просто обновляем пропсы
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        node: oldFiber.node,
        parent: currentFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }

    // Если нет старого элемента, но есть новый то добавляем новый fiber
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        node: null,
        parent: currentFiber,
        alternate: null,
        effectTag: "ADD",
      };
    }

    // Если есть старый элемент но нет нового то мы удаляем fiber
    if (oldFiber && !sameType) {

      oldFiber.effectTag = "DELETE";
      deleteFiber.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      currentFiber.child = newFiber;
    } else if (element) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
}

const isEvent = (key) => key.startsWith("on");
const isProperty = (key) => key !== "children" && !isEvent(key);
const isNew = (prev, next) => (key) => prev[key] !== next[key];
const isGone = (prev, next) => (key) => !(key in next);

// Функция обновления пропсов компонента fiber
function updateNode(node, prevProps, nextProps) {
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      node.removeEventListener(eventType, prevProps[name]);
    });

  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      node[name] = "";
    });

  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      node[name] = nextProps[name];
    });

  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      node.addEventListener(eventType, nextProps[name]);
    });
}

// Хук useState 
function useState(initialState) {
  const oldHook =
    workingFiber.alternate &&
    workingFiber.alternate.hooks &&
    workingFiber.alternate.hooks[hookIndex];
  // console.log("oldHook", oldHook);
  // Объект hook в котором храним состояние и объект с экшенами
  const hook = {
    state: oldHook ? oldHook.state : initialState,
    queue: [],
  };

  // Вызываем экшены
  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action) => {
    hook.state = action instanceof Function ? action(hook.state) : action;
  });

  // Чтобы вызывать несколько useState в компоненте, добавляем их в массив текущего fiber
  workingFiber.hooks.push(hook);
  hookIndex++;

  const setState = (action) => {
    // Добавляем экшены в массив хука
    hook.queue.push(action);
    // console.log(currentRoot);
    workingRoot = {
      node: currentRoot.node,
      props: currentRoot.props,
      alternate: currentRoot,
    };

    nextUnitOfWork = workingRoot;
  };

  return [hook.state, setState];
}

// Функция отвечающая за рекурсивное добавление в дом элементов(fiber)
function commitRoot() {
  deleteFiber.forEach(commitWork);
  commitWork(workingRoot.child);
  currentRoot = workingRoot;
  workingRoot = null;
}

function commitWork(fiber) {
  if (!fiber) return;

  let parentNode = fiber.parent.node;
  let parentFiber = fiber.parent;
  while (!parentFiber.node) {
    parentFiber = parentFiber.parent;
  }

  parentNode = parentFiber.node;

  switch (fiber.effectTag) {
    case "ADD":
      fiber.node != null && parentNode.appendChild(fiber.node);
      break;
    case "UPDATE":
      updateNode(fiber.node, fiber.alternate.props, fiber.props);
      break;
    case "DELETE":
      return commitRemove(fiber);
      break;
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitRemove(fiber) {
  if (fiber.node) {
    return fiber.node.remove();
  }
  commitRemove(fiber.child);
}

requestIdleCallback(workLoop);
