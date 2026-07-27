/**
 * The markup vocabulary, as React Native components.
 *
 * Zero Native's `app.native` is written in a fixed set of elements —
 * `column`, `row`, `panel`, `text`/`span`, `badge`, `button`, `avatar`,
 * `icon`, `separator`, `spacer`, `grid`, `list-item`, `toggle-button`.
 * This module implements that vocabulary once so the screens can be a
 * near-line-for-line transcription of the markup instead of a rewrite.
 *
 * Naming note: `Text` and `View` are taken by React Native, so the
 * components here are `Txt` and `Col`/`Row`. Everything else keeps the
 * markup's name.
 */
import React from 'react';
import {
  Pressable,
  Text as RNText,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock,
  Music,
  Plus,
  Search,
  Send,
} from 'lucide-react-native';

import { useTheme } from '../theme/ThemeProvider';
import {
  fontSize,
  fontWeight,
  radius,
  type FontSizeToken,
  type FontWeightToken,
  type Palette,
  type RadiusToken,
} from '../theme/tokens';

// ---------------------------------------------------------------------------
// Layout: <column>, <row>, <spacer>, <separator>, <stack>

type Main = 'start' | 'center' | 'end' | 'space_between';
type Cross = 'start' | 'center' | 'end' | 'stretch';

const MAIN: Record<Main, ViewStyle['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  space_between: 'space-between',
};

const CROSS: Record<Cross, ViewStyle['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

export type BoxProps = {
  gap?: number;
  padding?: number;
  main?: Main;
  cross?: Cross;
  grow?: number;
  width?: number | `${number}%`;
  height?: number;
  background?: keyof Palette;
  radius?: RadiusToken;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Maps to the markup's `label=` — the accessibility name. */
  label?: string;
  children?: React.ReactNode;
};

function useBoxStyle(props: BoxProps, direction: 'row' | 'column'): ViewStyle {
  const { colors } = useTheme();
  return {
    flexDirection: direction,
    gap: props.gap,
    padding: props.padding,
    justifyContent: props.main ? MAIN[props.main] : undefined,
    alignItems: props.cross ? CROSS[props.cross] : undefined,
    flexGrow: props.grow,
    flexShrink: props.grow ? 1 : undefined,
    flexBasis: props.grow ? 0 : undefined,
    width: props.width,
    height: props.height,
    backgroundColor: props.background ? colors[props.background] : undefined,
    borderRadius: props.radius ? radius[props.radius] : undefined,
  };
}

function Box({ direction, ...props }: BoxProps & { direction: 'row' | 'column' }) {
  const style = useBoxStyle(props, direction);
  if (props.onPress) {
    return (
      <Pressable
        onPress={props.onPress}
        accessibilityRole="button"
        accessibilityLabel={props.label}
        style={({ pressed }) => [style, pressed && { opacity: 0.7 }, props.style]}
      >
        {props.children}
      </Pressable>
    );
  }
  return (
    <View
      style={[style, props.style]}
      accessible={props.label ? true : undefined}
      accessibilityLabel={props.label}
    >
      {props.children}
    </View>
  );
}

/** `<column>` */
export const Col = (props: BoxProps) => <Box {...props} direction="column" />;

/** `<row>` */
export const Row = (props: BoxProps) => <Box {...props} direction="row" />;

/** `<panel>` — a column that carries a background and radius. */
export const Panel = (props: BoxProps) => <Box {...props} direction="column" />;

/** `<spacer>` */
export function Spacer({ width, height, grow }: { width?: number; height?: number; grow?: number }) {
  return <View style={{ width, height, flexGrow: grow }} />;
}

/** `<separator>` */
export function Separator() {
  const { colors } = useTheme();
  return <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />;
}

/**
 * `<stack>` — children layered on top of each other. The first child is
 * the base layer; the rest are absolutely positioned to fill it.
 */
export function Stack({ grow, children }: { grow?: number; children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  return (
    <View style={{ flexGrow: grow, flexShrink: grow ? 1 : undefined, flexBasis: grow ? 0 : undefined }}>
      {items.map((child, i) => (
        <View key={i} style={i === 0 ? { flex: 1 } : StyleSheetAbsoluteFill}>
          {child}
        </View>
      ))}
    </View>
  );
}

const StyleSheetAbsoluteFill: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

// ---------------------------------------------------------------------------
// <text> / <span>

export type TxtProps = {
  size?: FontSizeToken;
  /** `foreground=` in the markup. */
  color?: keyof Palette;
  weight?: FontWeightToken;
  /** `scale=` multiplies the resolved size. */
  scale?: number;
  align?: 'start' | 'center' | 'end';
  grow?: number;
  wrap?: boolean;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
};

const ALIGN: Record<NonNullable<TxtProps['align']>, TextStyle['textAlign']> = {
  start: 'left',
  center: 'center',
  end: 'right',
};

export function Txt({
  size = 'base',
  color = 'text',
  weight = 'regular',
  scale,
  align,
  grow,
  style,
  children,
}: TxtProps) {
  const { colors } = useTheme();
  const resolved = fontSize[size] * (scale ?? 1);
  return (
    <RNText
      style={[
        {
          fontSize: resolved,
          lineHeight: Math.round(resolved * 1.35),
          color: colors[color],
          fontWeight: fontWeight[weight],
          textAlign: align ? ALIGN[align] : undefined,
          flexGrow: grow,
          flexShrink: grow ? 1 : undefined,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

/**
 * `<span>` — nested runs inside a `<text>`. React Native inherits text
 * style through nesting, so this only restates what the run overrides.
 */
export function Span({ weight, scale, color, children }: TxtProps) {
  const { colors } = useTheme();
  return (
    <RNText
      style={{
        fontWeight: weight ? fontWeight[weight] : undefined,
        color: color ? colors[color] : undefined,
        fontSize: scale ? fontSize.base * scale : undefined,
      }}
    >
      {children}
    </RNText>
  );
}

// ---------------------------------------------------------------------------
// <icon>

const ICONS = {
  search: Search,
  'circle-dot': CircleDot,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  plus: Plus,
  check: Check,
  music: Music,
  clock: Clock,
  send: Send,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 16,
  color = 'text',
}: {
  name: IconName;
  size?: number;
  color?: keyof Palette;
}) {
  const { colors } = useTheme();
  const Cmp = ICONS[name];
  return <Cmp size={size} color={colors[color]} strokeWidth={2} />;
}

// ---------------------------------------------------------------------------
// <badge>

export function Badge({
  variant = 'primary',
  children,
}: {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const secondary = variant === 'secondary';
  return (
    <View
      style={{
        backgroundColor: secondary ? colors.surface_subtle : colors.accent,
        borderRadius: radius.full,
        paddingHorizontal: 9,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <RNText
        style={{
          fontSize: fontSize.sm - 1,
          fontWeight: fontWeight.medium,
          color: secondary ? colors.text : colors.accent_text,
        }}
      >
        {children}
      </RNText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// <button> / <toggle-button>

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: 'sm' | 'base';
  icon?: IconName;
  selected?: boolean;
  disabled?: boolean;
  grow?: number;
  onPress?: () => void;
  label?: string;
  children?: React.ReactNode;
};

function buttonColors(
  colors: Palette,
  variant: ButtonVariant,
  selected: boolean,
): { background: string; border: string; foreground: keyof Palette } {
  if (selected) {
    return { background: colors.accent, border: colors.accent, foreground: 'accent_text' };
  }
  switch (variant) {
    case 'primary':
      return { background: colors.accent, border: colors.accent, foreground: 'accent_text' };
    case 'secondary':
      return { background: colors.surface_subtle, border: 'transparent', foreground: 'text' };
    case 'outline':
      return { background: 'transparent', border: colors.border, foreground: 'text' };
    case 'ghost':
      return { background: 'transparent', border: 'transparent', foreground: 'text' };
  }
}

export function Button({
  variant = 'secondary',
  size = 'base',
  icon,
  selected = false,
  disabled = false,
  grow,
  onPress,
  label,
  children,
}: ButtonProps) {
  const { colors } = useTheme();
  const c = buttonColors(colors, variant, selected);
  const pad = size === 'sm' ? { paddingHorizontal: 12, paddingVertical: 7 } : { paddingHorizontal: 14, paddingVertical: 10 };
  const hasText = children !== undefined && children !== null && children !== '';

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label ?? (typeof children === 'string' ? children : undefined)}
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.background,
          flexGrow: grow,
          flexShrink: grow ? 1 : undefined,
          flexBasis: grow ? 0 : undefined,
          opacity: disabled ? 0.4 : 1,
        },
        pad,
        pressed && !disabled && { opacity: 0.72 },
      ]}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 14 : 16} color={c.foreground} /> : null}
      {hasText ? (
        <RNText
          style={{
            fontSize: size === 'sm' ? fontSize.sm : fontSize.base,
            fontWeight: fontWeight.medium,
            color: colors[c.foreground],
          }}
        >
          {children}
        </RNText>
      ) : null}
    </Pressable>
  );
}

/** `<toggle-button>` — a pill in a `<toggle-group>`. */
export function ToggleButton({
  selected,
  onPress,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      style={({ pressed }) => [
        {
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: selected ? colors.accent : colors.border,
          backgroundColor: selected ? colors.accent : 'transparent',
          paddingHorizontal: 13,
          paddingVertical: 7,
        },
        pressed && { opacity: 0.72 },
      ]}
    >
      <RNText
        style={{
          fontSize: fontSize.sm,
          fontWeight: fontWeight.medium,
          color: selected ? colors.accent_text : colors.text,
        }}
      >
        {children}
      </RNText>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// <avatar>

export function Avatar({
  size = 40,
  onPress,
  label,
  selected = false,
  children,
}: {
  size?: number;
  onPress?: () => void;
  label?: string;
  selected?: boolean;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const body = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: selected ? 3 : 0,
        borderColor: colors.background,
      }}
    >
      <RNText
        style={{
          color: colors.accent_text,
          fontWeight: fontWeight.bold,
          fontSize: Math.max(10, Math.round(size * 0.34)),
        }}
      >
        {children}
      </RNText>
    </View>
  );
  if (!onPress) {
    return label ? (
      <View accessible accessibilityLabel={label}>
        {body}
      </View>
    ) : (
      body
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => (pressed ? { opacity: 0.72 } : undefined)}
    >
      {body}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// <list-item>

export function ListItem({
  padding,
  onPress,
  label,
  children,
}: {
  padding?: number;
  onPress: () => void;
  label?: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          padding,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
        },
        pressed && { opacity: 0.72 },
      ]}
    >
      {children}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// <grid>

/**
 * `<grid columns=N gap=G>` — React Native has no grid, and percentage
 * widths cannot subtract the gaps, so the row width is measured once and
 * the cell width computed from it.
 */
export function Grid({
  columns,
  gap = 0,
  label,
  children,
}: {
  columns: number;
  gap?: number;
  label?: string;
  children: React.ReactNode;
}) {
  const [width, setWidth] = React.useState(0);
  const items = React.Children.toArray(children);
  const cell = width > 0 ? (width - gap * (columns - 1)) / columns : undefined;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible={label ? true : undefined}
      accessibilityLabel={label}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}
    >
      {cell === undefined
        ? null
        : items.map((child, i) => (
            <View key={i} style={{ width: cell }}>
              {child}
            </View>
          ))}
    </View>
  );
}
