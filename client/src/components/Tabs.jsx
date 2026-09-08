import { Tab } from "@headlessui/react";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Tabs({ tabs, setSelected, children }) {
  return (
    <div className="w-full">
      <Tab.Group>
        <Tab.List className="inline-flex gap-1 rounded-2xl p-1.5 bg-white border border-gray-200">
          {tabs.map((tab, index) => (
            <Tab
              key={tab.title}
              onClick={() => setSelected(index)}
              className={({ selected }) =>
                classNames(
                  "w-fit flex items-center outline-none gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all",
                  selected
                    ? "text-white bg-indigo-600 shadow-glow"
                    : "text-gray-600 bg-transparent hover:text-indigo-700 hover:bg-gray-100",
                )
              }
            >
              {tab.icon}
              <span>{tab.title}</span>
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="w-full mt-8">{children}</Tab.Panels>
      </Tab.Group>
    </div>
  );
}
