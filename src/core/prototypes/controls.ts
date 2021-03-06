import { DataMappingHints } from ".";
import { Color, Point } from "../common";
import * as Specification from "../specification";
import { AttributeDescription } from "./common";

export type Widget = any;

export interface Property {
  property: string;
  field?: string | string[];
  noUpdateState?: boolean;
  noComputeLayout?: boolean;
}

export interface InputSelectOptions {
  type: "radio" | "dropdown";
  showLabel?: boolean;

  options: string[];
  icons?: string[];
  labels?: string[];
}

export interface InputBooleanOptions {
  type: "checkbox" | "highlight";
  icon?: string;
  label?: string;
}

export interface RowOptions {
  dropzone?: {
    type: "axis-data-binding";
    prompt?: string;
    attribute?: string;
  };
}

export interface DropTargetOptions {
  type: "order";
  property: Property;
  label: string;
}

export interface OrderWidgetOptions {
  table: string;
}

export interface MappingEditorOptions {
  /** Hints for creating data mapping */
  hints?: DataMappingHints;

  /** When no mapping is specified, show the default value */
  defaultValue?: Specification.AttributeValue;
  /** When no mapping is specified, and no default value, show auto (true) or none (false). */
  defaultAuto?: boolean;

  /** Only allow mapping from one table */
  table?: string;
  acceptKinds?: string[];

  numberOptions?: InputNumberOptions;
}

export interface InputNumberOptions {
  digits?: number;
  minimum?: number;
  maximum?: number;
  percentage?: boolean;

  showSlider?: boolean;
  sliderRange?: [number, number];

  showUpdown?: boolean;
  updownTick?: number;
  updownRange?: [number, number];
  updownStyle?: "normal" | "font";
}

export interface InputColorOptions {
  allowNull?: boolean;
}

export interface TableOptions {}

export interface WidgetManager {
  // A row for value/data mapping.
  mappingEditorTOFIX(attribute: string): Widget;
  mappingEditor(
    name: string,
    attribute: string,
    type: string,
    options: MappingEditorOptions
  ): Widget;

  // Basic property widgets
  inputNumber(property: Property, options?: InputNumberOptions): Widget;
  inputText(property: Property): Widget;
  inputSelect(property: Property, options: InputSelectOptions): Widget;
  inputBoolean(property: Property, options: InputBooleanOptions): Widget;
  inputExpression(property: Property): Widget;
  inputImage(property: Property): Widget;
  inputColor(property: Property, options?: InputColorOptions): Widget;
  inputColorGradient(property: Property, inline?: boolean): Widget;

  // A button, once clicked, set the property to null.
  clearButton(property: Property, icon?: string): Widget;
  setButton(
    property: Property,
    value: Specification.AttributeValue,
    icon?: string,
    text?: string
  ): Widget;

  // Order by data button. Map data to "sortBy" expression
  orderByWidget(property: Property, options: OrderWidgetOptions): Widget;

  // Reorder widget: allow user to reorder the items in a property
  reorderWidget(property: Property): Widget;

  dropTarget(options: DropTargetOptions, widget: Widget): Widget;

  // Label and text
  icon(icon: string): Widget;
  label(title: string): Widget;
  text(text: string, align?: "left" | "center" | "right"): Widget;
  // Inline separator
  sep(): Widget;

  // Layout elements
  sectionHeader(title: string, widget?: Widget, options?: RowOptions): Widget;
  row(title: string, widget?: Widget, options?: RowOptions): Widget;
  detailsButton(...widgets: Widget[]): Widget;

  // Basic layout elements
  horizontal(cols: number[], ...widgets: Widget[]): Widget;
  vertical(...widgets: Widget[]): Widget;
  table(rows: Widget[][], options?: TableOptions): Widget;
}

export interface PopupEditor {
  anchor: Point;
  widgets: Widget[];
}
