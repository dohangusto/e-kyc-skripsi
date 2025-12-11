import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import 'liveness_event.dart';
import 'liveness_state.dart';

class LivenessBloc extends Bloc<LivenessEvent, LivenessState> {
  LivenessBloc()
    : super(
        const LivenessState(
          gestures: ['Tengok ke kanan', 'Tersenyum 😊', 'Kedipkan mata'],
          status: LivenessStatus.idle,
        ),
      ) {
    on<LivenessSessionStarted>(_onSessionStarted);
    on<LivenessGestureChanged>(_onGestureChanged);
    on<LivenessGestureCaptured>(_onGestureCaptured);
    on<LivenessSessionSubmitted>(_onSessionSubmitted);
  }

  FutureOr<void> _onSessionStarted(
    LivenessSessionStarted event,
    Emitter<LivenessState> emit,
  ) {
    emit(
      state.copyWith(
        currentIndex: 0,
        status: LivenessStatus.inProgress,
        errorMessage: null,
      ),
    );
  }

  FutureOr<void> _onGestureChanged(
    LivenessGestureChanged event,
    Emitter<LivenessState> emit,
  ) {
    emit(
      state.copyWith(
        currentIndex: event.gestureIndex.clamp(0, state.gestures.length - 1),
        status: LivenessStatus.inProgress,
      ),
    );
  }

  FutureOr<void> _onGestureCaptured(
    LivenessGestureCaptured event,
    Emitter<LivenessState> emit,
  ) async {
    if (state.isLastStep) {
      emit(state.copyWith(status: LivenessStatus.success));
      return;
    }

    final nextIndex = state.currentIndex + 1;
    emit(
      state.copyWith(
        currentIndex: nextIndex,
        status: LivenessStatus.inProgress,
      ),
    );
    await Future<void>.delayed(const Duration(milliseconds: 500));
  }

  FutureOr<void> _onSessionSubmitted(
    LivenessSessionSubmitted event,
    Emitter<LivenessState> emit,
  ) {
    emit(state.copyWith(status: LivenessStatus.success));
  }
}
