/**
 * Calendar — `app.native`'s `<if test="{isCalendar}">` block: the July 2026
 * grid with event dots and selection, and the timeline of the selected
 * day's events with its empty state.
 */
import React from 'react';
import { ScrollView } from 'react-native';

import type { Model, Msg } from '../core/model';
import {
  calCells,
  dayRows,
  hasDayEvents,
  noDayEvents,
  selectedDayName,
} from '../core/selectors';
import { Avatar, Button, Col, Grid, Icon, Panel, Row, Span, Txt } from '../ui/primitives';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function Calendar({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: (msg: Msg) => void;
}) {
  return (
    <ScrollView style={{ flex: 1 }} accessibilityLabel="Calendar">
      <Col padding={16} gap={14}>
        <Row cross="center" label="Calendar header">
          <Txt grow={1} size="heading">
            July 2026
          </Txt>
          <Button variant="ghost" icon="chevron-left" disabled label="Previous month" />
          <Button variant="ghost" icon="chevron-right" disabled label="Next month" />
        </Row>

        <Grid columns={7} gap={4} label="Weekday header">
          {WEEKDAYS.map((d, i) => (
            <Txt key={i} size="sm" color="text_muted" align="center">
              {d}
            </Txt>
          ))}
        </Grid>

        <Grid columns={7} gap={4} label="July 2026 days">
          {calCells(model).map((c) => {
            if (c.blank) return <Panel key={c.key} height={44} />;
            if (c.selected) {
              return (
                <Button
                  key={c.key}
                  variant="primary"
                  onPress={() => dispatch({ type: 'pick_day', day: c.day })}
                >
                  {c.day}
                </Button>
              );
            }
            if (c.dot) {
              return (
                <Panel
                  key={c.key}
                  background="surface"
                  radius="md"
                  onPress={() => dispatch({ type: 'pick_day', day: c.day })}
                  label={c.label}
                >
                  <Col main="center" cross="center" gap={2} padding={4} height={44}>
                    <Txt>{c.day}</Txt>
                    <Icon name="circle-dot" size={8} color="accent" />
                  </Col>
                </Panel>
              );
            }
            return (
              <Button
                key={c.key}
                variant="ghost"
                onPress={() => dispatch({ type: 'pick_day', day: c.day })}
              >
                {c.day}
              </Button>
            );
          })}
        </Grid>

        <Txt size="sm" color="text_muted">
          {selectedDayName(model).toUpperCase()}, JULY {model.selectedDay}
        </Txt>

        {hasDayEvents(model) ? (
          <Col gap={12}>
            {dayRows(model).map((e) => (
              <Row
                key={e.id}
                gap={12}
                onPress={() => dispatch({ type: 'open_event', id: e.id })}
                label={e.title}
              >
                <Col width={52} gap={2}>
                  <Txt align="end">
                    <Span weight="bold">{e.timeShort}</Span>
                  </Txt>
                  <Txt size="sm" color="text_muted" align="end">
                    {e.ampm}
                  </Txt>
                </Col>
                <Panel background="surface" radius="lg" grow={1}>
                  <Col padding={12} gap={4}>
                    <Txt>
                      <Span weight="bold">{e.title}</Span>
                    </Txt>
                    <Txt size="sm" color="text_muted">
                      {e.venue} - {e.dist}
                    </Txt>
                    <Row gap={6} cross="center">
                      <Avatar size={22}>{e.i1}</Avatar>
                      <Avatar size={22}>{e.i2}</Avatar>
                      <Avatar size={22}>{e.i3}</Avatar>
                      <Txt size="sm" color="text_muted">
                        {e.att} going
                      </Txt>
                    </Row>
                  </Col>
                </Panel>
              </Row>
            ))}
          </Col>
        ) : null}

        {noDayEvents(model) ? (
          <Col cross="center" gap={6} padding={24} label="Nothing planned">
            <Icon name="plus" size={24} color="text_muted" />
            <Txt size="sm">Nothing planned yet</Txt>
            <Txt size="sm" color="text_muted">
              Find something on the map
            </Txt>
          </Col>
        ) : null}
      </Col>
    </ScrollView>
  );
}
