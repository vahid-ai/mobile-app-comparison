/**
 * The bottom tab bar — `app.native`'s final `<if test="{showTabbar}">`
 * block. Hidden on the detail screen, exactly as `showTabbar` says.
 */
import React from 'react';

import type { Model, Msg } from '../core/model';
import { isCalendar, isDiscover, isMap, isYou } from '../core/selectors';
import { Button, Row } from '../ui/primitives';

export function TabBar({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: (msg: Msg) => void;
}) {
  return (
    <Row padding={8} gap={4} background="surface" label="Tab bar">
      <Button
        grow={1}
        variant="ghost"
        selected={isDiscover(model)}
        icon="music"
        onPress={() => dispatch({ type: 'go_discover' })}
      >
        Discover
      </Button>
      <Button
        grow={1}
        variant="ghost"
        selected={isMap(model)}
        icon="circle-dot"
        onPress={() => dispatch({ type: 'go_map' })}
      >
        Map
      </Button>
      <Button
        grow={1}
        variant="ghost"
        selected={isCalendar(model)}
        icon="clock"
        onPress={() => dispatch({ type: 'go_calendar' })}
      >
        Calendar
      </Button>
      <Button
        grow={1}
        variant="ghost"
        selected={isYou(model)}
        icon="send"
        onPress={() => dispatch({ type: 'go_you' })}
      >
        You
      </Button>
    </Row>
  );
}
