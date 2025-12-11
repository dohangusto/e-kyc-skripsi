import 'package:equatable/equatable.dart';

abstract class LivenessEvent extends Equatable {
  const LivenessEvent();

  @override
  List<Object?> get props => [];
}

class LivenessSessionStarted extends LivenessEvent {
  const LivenessSessionStarted();
}

class LivenessGestureChanged extends LivenessEvent {
  final int gestureIndex;

  const LivenessGestureChanged(this.gestureIndex);

  @override
  List<Object?> get props => [gestureIndex];
}

class LivenessGestureCaptured extends LivenessEvent {
  const LivenessGestureCaptured();
}

class LivenessSessionSubmitted extends LivenessEvent {
  const LivenessSessionSubmitted();
}
