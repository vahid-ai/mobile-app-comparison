/**
 * Map — `app.native`'s `<if test="{isMap}">` block: a pin field over the
 * venue map, the location chip, the floating bubble for the picked pin,
 * and the "events near you" bottom sheet.
 *
 * The one place this tree diverges from the Zero Native markup on purpose:
 * that markup places pins with spacer offsets inside a `<stack>` because
 * Zero Native lays out with flex only ("the design's absolutely positioned
 * map pins are placed with spacer offsets"). React Native has absolute
 * positioning, so the pins use the coordinates directly — the same
 * `pinLeft` / `pinTop` numbers, landing in the same places.
 */
import React from 'react';
import { View } from 'react-native';

import type { Model, Msg } from '../core/model';
import {
  mapCards,
  mapCount,
  mapPins,
  mapSelAtt,
  mapSelDist,
  mapSelTime,
  mapSelTitle,
  mapSelVenue,
} from '../core/selectors';
import { Avatar, Col, Icon, Panel, Row, Span, Stack, Txt } from '../ui/primitives';

export function MapScreen({
  model,
  dispatch,
}: {
  model: Model;
  dispatch: (msg: Msg) => void;
}) {
  return (
    <Stack grow={1}>
      {/* base layer: the map surface */}
      <Panel grow={1} background="surface_subtle" />

      {/* pins */}
      <View pointerEvents="box-none" style={{ flex: 1 }}>
        {mapPins(model).map((p) => (
          <View
            key={p.id}
            style={{ position: 'absolute', left: p.left, top: p.top }}
            pointerEvents="box-none"
          >
            <Avatar
              size={p.size}
              selected={p.selected}
              onPress={() => dispatch({ type: 'pick_pin', id: p.id })}
              label={p.title}
            >
              {p.id}
            </Avatar>
          </View>
        ))}
      </View>

      {/* location chip */}
      <View pointerEvents="box-none">
        <Col padding={12}>
          <Row
            gap={10}
            cross="center"
            padding={12}
            background="surface"
            radius="lg"
            label="Location"
          >
            <Icon name="circle-dot" size={14} color="text_muted" />
            <Txt size="sm">Bushwick, Brooklyn</Txt>
          </Row>
        </Col>
      </View>

      {/* bottom sheet */}
      <Col main="end" grow={1}>
        <Col padding={12}>
          <Panel
            background="surface"
            radius="lg"
            onPress={() => dispatch({ type: 'open_event', id: model.mapSelId })}
            label={mapSelTitle(model)}
          >
            <Row padding={12} gap={12} cross="center">
              <Avatar size={48}>{mapSelAtt(model)}</Avatar>
              <Col gap={2} grow={1}>
                <Txt>
                  <Span weight="bold">{mapSelTitle(model)}</Span>
                </Txt>
                <Txt size="sm" color="text_muted">
                  {mapSelVenue(model)} - {mapSelDist(model)}
                </Txt>
                <Txt size="sm" color="accent">
                  {mapSelTime(model)} - {mapSelAtt(model)} going
                </Txt>
              </Col>
              <Icon name="chevron-right" color="accent" />
            </Row>
          </Panel>
        </Col>

        <Panel background="surface" radius="xl" label="Events near you">
          <Col padding={16} gap={12}>
            <Txt>
              <Span weight="bold">{mapCount(model)} events near you</Span>
            </Txt>
            <Row gap={12}>
              {mapCards(model).map((m) => (
                <Panel
                  key={m.id}
                  background="surface_subtle"
                  radius="lg"
                  grow={1}
                  onPress={() => dispatch({ type: 'open_event', id: m.id })}
                  label={m.title}
                >
                  <Col padding={10} gap={6}>
                    <Avatar size={28}>{m.id}</Avatar>
                    <Txt size="sm">
                      <Span weight="bold">{m.title}</Span>
                    </Txt>
                    <Txt size="sm" color="text_muted">
                      {m.time} - {m.dist}
                    </Txt>
                  </Col>
                </Panel>
              ))}
            </Row>
          </Col>
        </Panel>
      </Col>
    </Stack>
  );
}
