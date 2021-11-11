import _ from "lodash";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Draggable from "react-draggable";
import clsx from "clsx";
import { useIsomorphicLayoutEffect } from "react-use";

type Binary = 0 | 1;

type TruthTable = Binary[][];

type GateTypeKey = number;
type GateType = {
  id: GateTypeKey;
  color: string;
  name: string;
  inputs: number;
  outputs: number;
  logic: TruthTable;
  cannotDelete?: true;
};

type Wire = {
  id: number;
  from: Gate | null; // null denotes an input-socket
  fromOutput: number;
  to: Gate | null; // null denotes an output-socket
  toInput: number;
  isOn: Binary | null; // HACK
};

type Gate = {
  id: number;
  type: GateTypeKey;
};

const getColor = (hue = _.random(0, 360)) => `hsl(${hue}, 90%, 30%)`;

const DEFAULT_GATE_TYPES: GateType[] = [
  {
    id: -1,
    name: "AND",
    color: getColor(147),
    inputs: 2,
    outputs: 1,
    logic: [[0], [0], [0], [1]],
    cannotDelete: true,
  },
  {
    id: -2,
    name: "NOT",
    color: getColor(0),
    inputs: 1,
    outputs: 1,
    logic: [[1], [0]],
    cannotDelete: true,
  },
];

const EXTRA_GATE_TYPES: GateType[] = [
  {
    id: -3,
    name: "OR",
    color: getColor(),
    inputs: 2,
    outputs: 1,
    logic: [[0], [1], [1], [1]],
  },
  {
    id: -4,
    name: "XOR",
    color: getColor(),
    inputs: 2,
    outputs: 1,
    logic: [[0], [1], [1], [0]],
  },
];

const useLocalStorage = <V,>(
  key: string,
  initValue: V
): [V, React.Dispatch<React.SetStateAction<V>>] => {
  const [state, setState] = useState<V>(() => {
    try {
      const v = localStorage.getItem(key);
      if (v != null) return JSON.parse(v) as V;
    } catch {}
    return initValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
};

type ConnectWire = (isInput: boolean, gate: Gate | null, index: number) => void;

const LogicGate: React.FC<{
  gate: Gate;
  gateType: GateType;
  isSelected?: boolean;
  onSelect: (gate: Gate) => void;
  connectWire: ConnectWire;
  updatePos: WireUpdater;
}> = ({ gate, gateType, isSelected, onSelect, connectWire, updatePos }) => {
  const nodes = Math.max(gateType.inputs, gateType.outputs, 1);

  const nodeRef = useRef(null);
  return (
    <Draggable
      onDrag={(_evt, _data) => {
        updatePos(gate);
      }}
      nodeRef={nodeRef}
      defaultPosition={{
        x: document.body.clientWidth / 2,
        y: document.body.clientHeight / 2,
      }}
    >
      <div ref={nodeRef} className="absolute z-10 inline-flex">
        <div
          onClick={() => onSelect(gate)}
          aria-selected={isSelected}
          style={{
            height: 16 + nodes * 16 + (nodes - 1) * 8,
            background: gateType.color,
          }}
          className={clsx(
            "flex items-center justify-center w-20 border-2 rounded select-none cursor-pointer text-white",
            isSelected
              ? "border-white"
              : "border-gray-400 hover:border-gray-300"
          )}
        >
          {gateType.name}
        </div>

        <div className="absolute top-0 -left-6 h-full flex flex-col items-center justify-center space-y-2">
          {Array.from({ length: gateType.inputs }).map((_a, i) => {
            return (
              <div key={"in" + i} className="relative">
                <div
                  className={clsx(
                    "h-1 w-6 bg-white absolute top-1/2 transform -translate-y-1/2",
                    "left-0"
                  )}
                />

                <div
                  data-gate-id={gate.id}
                  data-gate-dir="in"
                  data-gate-index={i}
                  aria-label="attach input wire"
                  onClick={() => connectWire(true, gate, i)}
                  className={clsx(
                    "relative w-4 h-4 rounded-full cursor-pointer bg-gray-400 hover:bg-gray-600"
                  )}
                />
              </div>
            );
          })}
        </div>

        <div className="absolute top-0 -right-6 h-full flex flex-col items-center justify-center space-y-2">
          {Array.from({ length: gateType.outputs }).map((_a, i) => {
            return (
              <div key={"out" + i} className="relative">
                <div
                  className={clsx(
                    "h-1 w-6 bg-white absolute top-1/2 transform -translate-y-1/2",
                    "right-0"
                  )}
                />

                <div
                  data-gate-id={gate.id}
                  data-gate-dir="out"
                  data-gate-index={i}
                  aria-label="attach output wire"
                  onClick={() => connectWire(false, gate, i)}
                  className={clsx(
                    "relative w-4 h-4 rounded-full cursor-pointer bg-gray-400 hover:bg-gray-600"
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>
    </Draggable>
  );
};

const InOutLane: React.FC<{
  dir: -1 | 1;
  disabled?: boolean;
  sockets: (Binary | null)[];
  setSocketValue?: (i: number, v: Binary) => void;
  setSocketCount: (c: number) => void;
  connectWire: ConnectWire;
}> = ({
  dir,
  disabled,
  sockets,
  setSocketValue,
  setSocketCount,
  connectWire,
}) => {
  return (
    <>
      <div
        className={clsx(
          "absolute top-0 w-10 h-full space-y-2 flex flex-col items-center justify-center bg-black",
          dir === -1 ? "right-0" : "left-0"
        )}
      >
        {sockets.map((value, i) => {
          return (
            <div key={i} className="relative">
              <div
                className={clsx(
                  "h-1 w-10 bg-white absolute top-1/2 transform -translate-y-1/2",
                  dir === -1 ? "right-0" : "left-0"
                )}
              />

              <button
                disabled={disabled}
                aria-label="toggle bit"
                onClick={() => {
                  setSocketValue?.(i, value === 0 ? 1 : 0);
                }}
                className={clsx(
                  "relative block w-6 h-6 rounded-full",
                  disabled && "pointer-events-none",
                  value === null
                    ? "bg-gray-600"
                    : value === 0
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-green-500 hover:bg-green-600"
                )}
              />

              <div
                data-gate-id=""
                data-gate-dir={dir === -1 ? "in" : "out"}
                data-gate-index={i}
                aria-label="attach wire"
                onClick={() => connectWire(dir === -1, null, i)}
                className={clsx(
                  "z-10 w-4 h-4 rounded-full cursor-pointer bg-gray-400 hover:bg-gray-600 absolute top-1/2 transform -translate-y-1/2",
                  dir === -1 ? "right-10" : "left-10"
                )}
              />
            </div>
          );
        })}

        <div className="absolute bottom-0 left-0 w-full flex flex-col items-stretch p-1 space-y-1">
          <button
            aria-label="add a socket"
            className="bg-gray-300 hover:bg-gray-200 text-2xl font-semibold"
            onClick={() => {
              setSocketCount(sockets.length + 1);
            }}
          >
            +
          </button>
          <button
            aria-label="remove a socket"
            className="bg-gray-300 hover:bg-gray-200 text-2xl font-semibold"
            onClick={() => {
              if (sockets.length > 1) {
                setSocketCount(sockets.length - 1);
              }
            }}
          >
            -
          </button>
        </div>
      </div>
    </>
  );
};

const getWirePos = (wire: Wire) => {
  const fromEl = document.querySelector(
    `[data-gate-id="${wire.from?.id ?? ""}"][data-gate-index="${
      wire.fromOutput
    }"][data-gate-dir="out"]`
  );
  const toEl = document.querySelector(
    `[data-gate-id="${wire.to?.id ?? ""}"][data-gate-index="${
      wire.toInput
    }"][data-gate-dir="in"]`
  );

  if (!fromEl || !toEl) return null;

  const b1 = fromEl.getBoundingClientRect();
  const b2 = toEl.getBoundingClientRect();

  return {
    x1: b1.x + b1.width / 2,
    y1: b1.y + b1.height / 2,
    x2: b2.x + b2.width / 2,
    y2: b2.y + b2.height / 2,
  };
};

type PendingWire = Pick<Wire, "from" | "fromOutput">;

const getPendingWirePos = (
  pendingWire: PendingWire,
  mouseX: number,
  mouseY: number
) => {
  const fromEl = document.querySelector(
    `[data-gate-id="${pendingWire.from?.id ?? ""}"][data-gate-index="${
      pendingWire.fromOutput
    }"][data-gate-dir="out"]`
  );

  if (!fromEl) return null;

  const b = fromEl.getBoundingClientRect();

  return {
    x1: b.x + b.width / 2,
    y1: b.y + b.height / 2,
    x2: mouseX,
    y2: mouseY,
  };
};

const useMousePos = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      setMousePos({ x: e.pageX, y: e.pageY });
    };
    window.addEventListener("mousemove", fn);
    return () => {
      window.removeEventListener("mousemove", fn);
    };
  }, []);
  return mousePos;
};

const Line: React.FC<{
  line: { x1: number; y1: number; x2: number; y2: number } | null;
  color?: string;
}> = ({ line, color = "#ffffff" }) => {
  if (!line) return null;

  const dist = Math.sqrt(
    (line.x2 - line.x1) * (line.x2 - line.x1) +
      (line.y2 - line.y1) * (line.y2 - line.y1)
  );
  const bezier = Math.min(dist, 200);

  return (
    <svg className="overflow-visible pointer-events-none fixed left-0 top-0">
      <path
        strokeWidth="2px"
        stroke={color}
        fill="none"
        d={`M${line.x1},${line.y1} C${line.x1 + bezier},${line.y1} ${
          line.x2 - bezier
        },${line.y2} ${line.x2},${line.y2}`}
      />
    </svg>
  );
};

const DrawPendingWire: React.FC<{ pendingWire: PendingWire | null }> = ({
  pendingWire,
}) => {
  const mousePos = useMousePos();

  return pendingWire ? (
    <Line line={getPendingWirePos(pendingWire, mousePos.x, mousePos.y)} />
  ) : null;
};

type WireUpdater = (gate?: Gate) => void;

const DrawWire: React.FC<{
  wire: Wire;
  updateRef: React.MutableRefObject<WireUpdater[]>;
}> = ({ wire, updateRef }) => {
  const [line, setLine] = useState(() => getWirePos(wire));

  useIsomorphicLayoutEffect(() => {
    const onUpdate: WireUpdater = (gate) => {
      if (!gate || wire.to === gate || wire.from === gate) {
        setLine(getWirePos(wire));
      }
    };
    const arr = updateRef.current;
    updateRef.current.push(onUpdate);
    return () => {
      _.pull(arr, onUpdate);
    };
  }, []);

  return (
    <Line
      line={line}
      color={
        wire.isOn === 0 ? "#ff0000" : wire.isOn === 1 ? "#00ff00" : "#ffffff"
      }
    />
  );
};

const calcOutput = (
  inputSockets: Binary[],
  outputCount: number,
  gateTypes: GateType[],
  wires: Wire[],
  modifyWires: boolean
): (Binary | null)[] => {
  const gateMap = new WeakMap<Gate, Binary[]>();

  wires = [...wires];

  const gateTypeMap = _.keyBy(gateTypes, (gt) => gt.id);

  if (modifyWires) for (const w of wires) w.isOn = null;

  const getOutput = (toGate: Gate | null, toIndex: number): Binary | null => {
    const [wire] = _.remove(
      wires,
      (w) => w.to === toGate && w.toInput === toIndex
    );
    if (!wire) return null;

    const { from: gate, fromOutput: index } = wire;

    if (!gate) {
      if (modifyWires) wire.isOn = inputSockets[index];

      return inputSockets[index];
    }

    const cached = gateMap.get(gate);
    if (cached) {
      if (modifyWires) wire.isOn = cached[index];

      return cached[index];
    }

    const gateType = gateTypeMap[gate.type];
    if (!gateType) return null; // abort!

    let inputAsIndex = 0;

    let failed = false;
    for (let i = 0; i < gateType.inputs; i++) {
      const v = getOutput(gate, i);
      if (v == null) {
        failed = true;
      } else if (v === 1) inputAsIndex |= 1 << i;
    }

    if (failed) return null;

    const outputs = gateType.logic[inputAsIndex];
    if (!outputs) return null;

    gateMap.set(gate, outputs);

    if (modifyWires) wire.isOn = outputs[index];

    return outputs[index];
  };

  return Array.from({ length: outputCount }).map((_a, i) => {
    return getOutput(null, i) ?? null;
  });
};

const getTruthTable = (
  inputCount: number,
  outputCount: number,
  gateTypes: GateType[],
  wires: Wire[]
) => {
  const table: TruthTable = [];

  const c = Math.max(2, inputCount ** 2);
  for (let n = 0; n < c; n++) {
    const inputSockets: Binary[] = Array.from({ length: inputCount }).map(
      (_a, i) => ((n & (1 << i)) === 0 ? 0 : 1)
    );

    const outputSockets = calcOutput(
      inputSockets,
      outputCount,
      gateTypes,
      wires,
      false
    );

    if (outputSockets.some((s) => s === null)) return null;

    table.push(outputSockets as Binary[]);
  }

  return table;
};

export const LogicGates = () => {
  const [inputSockets, setInputSockets] = useState<Binary[]>([0, 0]);
  const [outputSocketCount, setOutputSocketCount] = useState<number>(1);

  const [customGateTypes, setCustomGateTypes] = useLocalStorage<GateType[]>(
    "gate_types",
    EXTRA_GATE_TYPES
  );
  const [gates, setGates] = useState<Gate[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);

  const [selectedGate, setSelectedGate] = useState<Gate | null>(null);
  const [pendingWire, setPendingWire] = useState<PendingWire | null>(null);

  const gateTypes = useMemo(
    () => [...DEFAULT_GATE_TYPES, ...(customGateTypes || [])],
    [customGateTypes]
  );

  const outputSockets = useMemo(() => {
    return calcOutput(inputSockets, outputSocketCount, gateTypes, wires, true);
  }, [inputSockets, outputSocketCount, gateTypes, wires]);

  const clearGates = () => {
    setWires([]);
    setGates([]);
    setPendingWire(null);
    setSelectedGate(null);
  };

  const idCounter = useRef(Math.max(...gateTypes.map((gt) => gt.id)) + 1);

  const addGate = (type: GateTypeKey) => {
    const gateType = gateTypes.find((gt) => gt.id === type);
    if (!gateType) return;

    const gate: Gate = {
      id: idCounter.current++,
      type,
    };
    setGates((prev) => [...prev, gate]);
    setSelectedGate(gate);
    setPendingWire(null);
  };

  const deleteGate = (gate: Gate) => {
    setSelectedGate(null);
    setPendingWire(null);
    setGates((prev) => _.without(prev, gate));
    setWires((prev) => prev.filter((w) => w.from !== gate && w.to !== gate));
  };

  const genGateType = () => {
    const truthTable = getTruthTable(
      inputSockets.length,
      outputSocketCount,
      gateTypes,
      wires
    );
    if (!truthTable) return;

    const gateTypeName = prompt("Enter a gate name:");
    if (!gateTypeName) return;

    const gateType: GateType = {
      id: idCounter.current++,
      name: gateTypeName,
      color: `hsl(${_.random(0, 360)}, 100%, 40%)`,
      inputs: inputSockets.length,
      outputs: outputSocketCount,
      logic: truthTable,
    };

    setCustomGateTypes((prev) => [...(prev || []), gateType]);
    clearGates();
  };

  const removeGateType = (type: GateTypeKey) => {
    clearGates();
    setCustomGateTypes((prev) => (prev || []).filter((gt) => gt.id !== type));
  };

  const connectWire: ConnectWire = (isInput, gate, index) => {
    setSelectedGate(null);

    if (!isInput) {
      setPendingWire({
        from: gate,
        fromOutput: index,
      });
    } else if (pendingWire) {
      setPendingWire(null);

      setWires((prev) => [
        ...prev.filter((w) => !(w.to === gate && w.toInput === index)),
        {
          id: idCounter.current++,
          from: pendingWire.from,
          fromOutput: pendingWire.fromOutput,
          to: gate,
          toInput: index,
          isOn: null,
        },
      ]);
    } else {
      setWires((prev) =>
        prev.filter((w) => !(w.to === gate && w.toInput === index))
      );
    }
  };

  const wireUpdateRef = useRef<WireUpdater[]>([]);
  const updatePos: WireUpdater = (...args) => {
    for (const w of wireUpdateRef.current) w(...args);
  };
  useIsomorphicLayoutEffect(() => {
    updatePos();
  }, [inputSockets, outputSocketCount]);

  return (
    <>
      <div className="p-2 flex items-center space-x-4">
        <button
          className="p-2 border bg-white hover:bg-gray-200"
          onClick={genGateType}
        >
          Create new gate
        </button>
        <button
          className="p-2 border bg-white hover:bg-gray-200"
          onClick={clearGates}
        >
          Clear
        </button>

        {gateTypes.map((gt) => {
          return (
            <div key={gt.id} className="relative">
              <button
                className="p-2 border bg-gray-200 hover:bg-gray-300"
                onClick={() => addGate(gt.id)}
              >
                + {gt.name}
              </button>

              {!gt.cannotDelete && (
                <button
                  className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-400 hover:bg-gray-500 text-xs text-white leading-none flex items-center justify-center"
                  onClick={() => removeGateType(gt.id)}
                >
                  X
                </button>
              )}
            </div>
          );
        })}

        {selectedGate ? (
          <>
            <div className="flex flex-col items-stretch flex-1" />
            <button
              className="p-2 border bg-red-300 hover:bg-red-500"
              onClick={() => deleteGate(selectedGate)}
            >
              Delete
            </button>
          </>
        ) : null}
      </div>

      <div
        className="relative bg-gray-800 flex-1 overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedGate(null);
            setPendingWire(null);
          }
        }}
      >
        <InOutLane
          dir={1}
          sockets={inputSockets}
          setSocketValue={(i, v) => {
            setInputSockets((prev) => {
              prev = [...prev];
              prev[i] = v;
              return prev;
            });
          }}
          setSocketCount={(count) => {
            const delta = count - inputSockets.length;
            setWires((prev) =>
              prev.filter((w) => !(w.from === null && w.fromOutput >= count))
            );
            setInputSockets(
              delta > 0
                ? [
                    ...inputSockets,
                    ...Array.from({ length: delta }).map(() => 0 as Binary),
                  ]
                : inputSockets.slice(0, count)
            );
          }}
          connectWire={connectWire}
        />
        <InOutLane
          dir={-1}
          disabled
          sockets={outputSockets}
          setSocketCount={(count) => {
            setWires((prev) =>
              prev.filter((w) => !(w.to === null && w.toInput >= count))
            );
            setOutputSocketCount(count);
          }}
          connectWire={connectWire}
        />

        {gates.map((gate) => {
          return (
            <LogicGate
              key={gate.id}
              gate={gate}
              gateType={gateTypes.find((gt) => gt.id === gate.type)!}
              isSelected={selectedGate === gate}
              onSelect={setSelectedGate}
              connectWire={connectWire}
              updatePos={updatePos}
            />
          );
        })}

        {wires.map((wire) => {
          return (
            <DrawWire key={wire.id} wire={wire} updateRef={wireUpdateRef} />
          );
        })}

        <DrawPendingWire pendingWire={pendingWire} />
      </div>
    </>
  );
};
